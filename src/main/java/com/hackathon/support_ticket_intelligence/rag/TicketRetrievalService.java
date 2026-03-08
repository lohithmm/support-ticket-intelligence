package com.hackathon.support_ticket_intelligence.rag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TicketRetrievalService {

    private final VectorStore vectorStore;

    public List<SimilarTicket> findSimilarTickets(String query, int topK) {
        log.debug("Searching for similar tickets with query: {}", query);

        List<Document> results = vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query(query)
                        .topK(topK)
                        .similarityThreshold(0.5)
                        .build()
        );

        return results.stream()
            .map(this::toSimilarTicket)
            .toList();
    }

    private SimilarTicket toSimilarTicket(Document doc) {
        Map<String, Object> meta = doc.getMetadata();
        return new SimilarTicket(
            (String) meta.getOrDefault("ticketNumber", ""),
            (String) meta.getOrDefault("title", ""),
            (String) meta.getOrDefault("category", ""),
            (String) meta.getOrDefault("priority", ""),
            (String) meta.getOrDefault("resolutionNotes", ""),
            doc.getText()
        );
    }

    public record SimilarTicket(
        String ticketNumber,
        String title,
        String category,
        String priority,
        String resolutionNotes,
        String fullContent
    ) {}
}
