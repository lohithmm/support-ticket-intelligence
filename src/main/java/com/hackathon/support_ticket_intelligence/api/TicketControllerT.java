package com.hackathon.support_ticket_intelligence.api;

import com.hackathon.support_ticket_intelligence.ai.TicketAiService;
import com.hackathon.support_ticket_intelligence.ai.TicketAiService.ResolutionSuggestion;
import com.hackathon.support_ticket_intelligence.rag.TicketRetrievalService;
import com.hackathon.support_ticket_intelligence.model.Ticket;
import com.hackathon.support_ticket_intelligence.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ticketst/sds")
@CrossOrigin(origins = "http://localhost:51738")
@RequiredArgsConstructor
public class TicketControllerT {

    private final TicketRepository ticketRepository;
    private final TicketAiService aiService;
    private final TicketRetrievalService retrievalService;

    // ─── GET /api/tickets ────────────────────────────────────────────────────────
    // Returns all tickets with SLA risk computed
    @GetMapping
    public List<Ticket> getAllTickets() {
        List<Ticket> tickets = ticketRepository.findAll();
        tickets.forEach(Ticket::computeSlaRisk);
        return tickets;
    }

    // ─── GET /api/tickets/{id} ───────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<Ticket> getTicket(@PathVariable Long id) {
        return ticketRepository.findById(id)
            .map(t -> { t.computeSlaRisk(); return ResponseEntity.ok(t); })
            .orElse(ResponseEntity.notFound().build());
    }

    // ─── POST /api/tickets/{id}/summarise ────────────────────────────────────────
    @PostMapping("/{id}/summarise")
    public ResponseEntity<Map<String, String>> summariseTicket(@PathVariable Long id) {
        return ticketRepository.findById(id)
            .map(ticket -> {
                log.info("Summarising ticket {}", ticket.getTicketNumber());
                String summary = aiService.summariseTicket(ticket);
                return ResponseEntity.ok(Map.of("summary", summary));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ─── GET /api/tickets/{id}/similar ───────────────────────────────────────────
    @GetMapping("/{id}/similar")
    public ResponseEntity<?> getSimilarTickets(@PathVariable Long id) {
        return ticketRepository.findById(id)
            .map(ticket -> {
                log.info("Finding similar tickets for {}", ticket.getTicketNumber());
                String query = ticket.getTitle() + " " + ticket.getDescription();
                List<TicketRetrievalService.SimilarTicket> similar =
                    retrievalService.findSimilarTickets(query, 3);
                return ResponseEntity.ok(similar);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ─── GET /api/tickets/{id}/resolve ───────────────────────────────────────────
    @GetMapping("/{id}/resolve")
    public ResponseEntity<ResolutionSuggestion> getResolutionSuggestion(@PathVariable Long id) {
        return ticketRepository.findById(id)
            .map(ticket -> {
                log.info("Generating resolution suggestion for {}", ticket.getTicketNumber());
                ResolutionSuggestion suggestion = aiService.suggestResolution(ticket);
                return ResponseEntity.ok(suggestion);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ─── POST /api/tickets/{id}/draft-response ────────────────────────────────────
    @PostMapping("/{id}/draft-response")
    public ResponseEntity<Map<String, String>> draftClientResponse(@PathVariable Long id) {
        return ticketRepository.findById(id)
            .map(ticket -> {
                log.info("Drafting client response for {}", ticket.getTicketNumber());
                String draft = aiService.draftClientResponse(ticket);
                return ResponseEntity.ok(Map.of("draft", draft));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
