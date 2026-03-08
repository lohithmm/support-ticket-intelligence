package com.hackathon.support_ticket_intelligence.rag;


import com.hackathon.support_ticket_intelligence.model.Ticket;
import com.hackathon.support_ticket_intelligence.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DuplicateDetectionService {

    private static final double DUPLICATE_THRESHOLD = 0.75;
    private static final int    MAX_CANDIDATES      = 5;

    private final VectorStore       vectorStore;
    private final TicketRepository ticketRepository;

    public record DuplicateCandidate(
        String ticketNumber,
        String title,
        String status,
        String priority,
        double score
    ) {}

    /**
     * Check if a newly created ticket is a duplicate of any existing ticket.
     * Called right after creation — updates the ticket in-place if a match is found.
     */
    public void checkAndFlag(Ticket newTicket) {
        String query = newTicket.getTitle() + " " + newTicket.getDescription();

        try {
            List<Document> results = vectorStore.similaritySearch(
                SearchRequest.builder()
                    .query(query)
                    .topK(MAX_CANDIDATES)
                    .similarityThreshold(DUPLICATE_THRESHOLD)
                    .build()
            );

            // Filter out the ticket itself and already-resolved tickets
            Optional<Document> bestMatch = results.stream()
                .filter(doc -> {
                    String ticketNumber = (String) doc.getMetadata().get("ticketNumber");
                    String status       = (String) doc.getMetadata().get("status");
                    // Skip self, skip resolved/closed (they have their own RAG panel)
                    return ticketNumber != null
                        && !ticketNumber.equals(newTicket.getTicketNumber())
                        && !"RESOLVED".equals(status)
                        && !"CLOSED".equals(status);
                })
                .findFirst();

            if (bestMatch.isPresent()) {
                Document match     = bestMatch.get();
                String matchNumber = (String) match.getMetadata().get("ticketNumber");
                double score       = match.getScore();

                log.info("🔁 Duplicate detected: {} is similar to {} (score: {})",
                    newTicket.getTicketNumber(), matchNumber, score);

                newTicket.setPotentialDuplicate(true);
                newTicket.setDuplicateOfTicket(matchNumber);
                newTicket.setDuplicateSimilarityScore(score);
                ticketRepository.save(newTicket);
            } else {
                log.info("No duplicates found for {}", newTicket.getTicketNumber());
            }

        } catch (Exception e) {
            log.error("Duplicate check failed for {}: {}", newTicket.getTicketNumber(), e.getMessage());
        }
    }

    /**
     * On-demand duplicate scan — returns candidates without saving.
     * Used by the manual refresh endpoint.
     */
    public List<DuplicateCandidate> findDuplicates(Ticket ticket) {
        String query = ticket.getTitle() + " " + ticket.getDescription();
        List<DuplicateCandidate> candidates = new ArrayList<>();

        try {
            List<Document> results = vectorStore.similaritySearch(
                SearchRequest.builder()
                    .query(query)
                    .topK(MAX_CANDIDATES)
                    .similarityThreshold(DUPLICATE_THRESHOLD)
                    .build()
            );

            for (Document doc : results) {
                String ticketNumber = (String) doc.getMetadata().get("ticketNumber");
                String status       = (String) doc.getMetadata().get("status");
                String title        = (String) doc.getMetadata().get("title");
                String priority     = (String) doc.getMetadata().get("priority");

                if (ticketNumber == null || ticketNumber.equals(ticket.getTicketNumber())) continue;
                if ("RESOLVED".equals(status) || "CLOSED".equals(status))               continue;

                candidates.add(new DuplicateCandidate(ticketNumber, title, status, priority, doc.getScore()));
            }
        } catch (Exception e) {
            log.error("Duplicate scan failed: {}", e.getMessage());
        }

        return candidates;
    }
}
