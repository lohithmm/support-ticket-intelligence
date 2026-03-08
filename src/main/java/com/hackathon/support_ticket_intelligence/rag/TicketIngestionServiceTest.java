package com.hackathon.support_ticket_intelligence.rag;


import com.hackathon.support_ticket_intelligence.model.Ticket;
import com.hackathon.support_ticket_intelligence.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Order(2)
@RequiredArgsConstructor
public class TicketIngestionServiceTest implements CommandLineRunner {

    private final TicketRepository ticketRepository;
    private final VectorStore vectorStore;

    @Override
    public void run(String... args) {
        List<Ticket> resolvedTickets = ticketRepository.findByStatus("RESOLVED");

        if (resolvedTickets.isEmpty()) {
            log.warn("No resolved tickets found — skipping Qdrant ingestion");
            return;
        }

        // Probe Qdrant — if vectors already exist, skip to avoid duplicates
        try {
            List<Document> probe = vectorStore.similaritySearch(
                    SearchRequest.builder()
                            .query("login portal access")
                            .topK(1)
                            .similarityThreshold(0.0)
                            .build()
            );
            if (!probe.isEmpty()) {
                log.info("Qdrant already has {} vector(s) — skipping re-ingestion", probe.size());
                return;
            }
        } catch (Exception e) {
            log.warn("Qdrant probe failed, proceeding with ingestion: {}", e.getMessage());
        }

        log.info("Ingesting {} resolved tickets into Qdrant...", resolvedTickets.size());
        List<Document> documents = new ArrayList<>();

        for (Ticket ticket : resolvedTickets) {
            // Let Spring AI auto-generate a UUID — store ticketNumber in metadata instead
            Document doc = new Document(
                    buildDocumentContent(ticket),
                    Map.of(
                            "ticketNumber",    ticket.getTicketNumber(),
                            "category",        ticket.getCategory()        != null ? ticket.getCategory()        : "",
                            "priority",        ticket.getPriority()        != null ? ticket.getPriority()        : "",
                            "title",           ticket.getTitle()           != null ? ticket.getTitle()           : "",
                            "resolutionNotes", ticket.getResolutionNotes() != null ? ticket.getResolutionNotes() : ""
                    )
            );
            documents.add(doc);
        }

        vectorStore.add(documents);
        log.info("✅ Ingested {} resolved tickets into Qdrant", documents.size());
    }

    private String buildDocumentContent(Ticket ticket) {
        return String.format("""
            Ticket: %s
            Category: %s
            Priority: %s
            Title: %s
            Problem Description: %s
            Resolution: %s
            """,
                ticket.getTicketNumber(),
                ticket.getCategory(),
                ticket.getPriority(),
                ticket.getTitle(),
                ticket.getDescription(),
                ticket.getResolutionNotes()
        );
    }
}
