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
@Component
@Order(2)
@RequiredArgsConstructor
public class TicketIngestionService implements CommandLineRunner {

    private final TicketRepository ticketRepository;
    private final VectorStore vectorStore;

    @Override
    public void run(String... args) {
        // Probe Qdrant — skip if already populated
        try {
            List<Document> probe = vectorStore.similaritySearch(
                SearchRequest.builder()
                    .query("ticket issue problem")
                    .topK(1)
                    .similarityThreshold(0.0)
                    .build()
            );
            if (!probe.isEmpty()) {
                log.info("Qdrant already populated ({} vectors found) — skipping ingestion", probe.size());
                return;
            }
        } catch (Exception e) {
            log.warn("Qdrant probe failed, proceeding: {}", e.getMessage());
        }

        // Ingest ALL tickets (resolved for RAG resolution suggestions + open for duplicate detection)
        List<Ticket> allTickets = ticketRepository.findAll();
        if (allTickets.isEmpty()) {
            log.warn("No tickets found — skipping ingestion");
            return;
        }

        log.info("Ingesting {} tickets into Qdrant (resolved + open)...", allTickets.size());
        List<Document> documents = new ArrayList<>();

        for (Ticket ticket : allTickets) {
            Document doc = new Document(
                buildDocumentContent(ticket),
                Map.of(
                    "ticketNumber",    ticket.getTicketNumber(),
                    "category",        ticket.getCategory()        != null ? ticket.getCategory()        : "",
                    "priority",        ticket.getPriority()        != null ? ticket.getPriority()        : "",
                    "title",           ticket.getTitle()           != null ? ticket.getTitle()           : "",
                    "status",          ticket.getStatus()          != null ? ticket.getStatus()          : "",
                    "resolutionNotes", ticket.getResolutionNotes() != null ? ticket.getResolutionNotes() : ""
                )
            );
            documents.add(doc);
        }

        vectorStore.add(documents);
        log.info("✅ Ingested {} tickets into Qdrant", documents.size());
    }

    // Also expose for adding a single new ticket to Qdrant after creation
    public void ingestTicket(Ticket ticket) {
        try {
            Document doc = new Document(
                buildDocumentContent(ticket),
                Map.of(
                    "ticketNumber",    ticket.getTicketNumber(),
                    "category",        ticket.getCategory()        != null ? ticket.getCategory()        : "",
                    "priority",        ticket.getPriority()        != null ? ticket.getPriority()        : "",
                    "title",           ticket.getTitle()           != null ? ticket.getTitle()           : "",
                    "status",          ticket.getStatus()          != null ? ticket.getStatus()          : "",
                    "resolutionNotes", ticket.getResolutionNotes() != null ? ticket.getResolutionNotes() : ""
                )
            );
            vectorStore.add(List.of(doc));
            log.info("Ingested new ticket {} into Qdrant", ticket.getTicketNumber());
        } catch (Exception e) {
            log.error("Failed to ingest ticket {}: {}", ticket.getTicketNumber(), e.getMessage());
        }
    }

    private String buildDocumentContent(Ticket ticket) {
        return String.format("""
            Ticket: %s
            Category: %s
            Priority: %s
            Status: %s
            Title: %s
            Problem Description: %s
            Resolution: %s
            """,
            ticket.getTicketNumber(),
            ticket.getCategory(),
            ticket.getPriority(),
            ticket.getStatus(),
            ticket.getTitle(),
            ticket.getDescription(),
            ticket.getResolutionNotes() != null ? ticket.getResolutionNotes() : "Unresolved"
        );
    }
}
