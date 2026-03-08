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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;


@Slf4j
@RestController
@RequestMapping("/api/ticketsM")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class TicketControllerM {

    private final TicketRepository ticketRepository;
    private final TicketAiService aiService;
    private final TicketRetrievalService retrievalService;

    // ─── GET /api/tickets ────────────────────────────────────────────────────────
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

    // ─── POST /api/tickets ────────────────────────────────────────────────────────
    // Uses Map<String,Object> to avoid @ElementCollection deserialization issues
    @PostMapping
    public ResponseEntity<Ticket> createTicket(@RequestBody Map<String, Object> body) {
        String priority = (String) body.getOrDefault("priority", "MEDIUM");
        int slaHours = switch (priority) {
            case "CRITICAL" -> 4;
            case "HIGH"     -> 8;
            case "LOW"      -> 48;
            default         -> 24;
        };

        long count = ticketRepository.count();
        Ticket ticket = Ticket.builder()
                .ticketNumber("TKT-" + String.format("%03d", count + 1))
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .category((String) body.getOrDefault("category", "OTHER"))
                .priority(priority)
                .status((String) body.getOrDefault("status", "OPEN"))
                .customerName((String) body.get("customerName"))
                .customerEmail((String) body.get("customerEmail"))
                .companyName((String) body.get("companyName"))
                .customerPlan((String) body.getOrDefault("customerPlan", "FREE"))
                .assignedAgent((String) body.getOrDefault("assignedAgent", "Unassigned"))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .slaDeadline(LocalDateTime.now().plusHours(slaHours))
                .slaPolicy(slaHours + "h " + priority)
                .escalated(false)
                .reopenCount(0)
                .build();

        Ticket saved = ticketRepository.save(ticket);
        saved.computeSlaRisk();
        log.info("Created new ticket {}", saved.getTicketNumber());
        return ResponseEntity.ok(saved);
    }

    // ─── PATCH /api/tickets/{id} ─────────────────────────────────────────────────
    @PatchMapping("/{id}")
    public ResponseEntity<Ticket> updateTicket(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        return ticketRepository.findById(id)
                .map(ticket -> {
                    log.info("Updating ticket {} fields: {}", ticket.getTicketNumber(), updates.keySet());

                    if (updates.containsKey("status")) {
                        String newStatus = (String) updates.get("status");
                        ticket.setStatus(newStatus);
                        if ("RESOLVED".equals(newStatus) && ticket.getResolvedAt() == null) {
                            ticket.setResolvedAt(LocalDateTime.now());
                        }
                    }
                    if (updates.containsKey("priority"))        ticket.setPriority((String) updates.get("priority"));
                    if (updates.containsKey("assignedAgent"))   ticket.setAssignedAgent((String) updates.get("assignedAgent"));
                    if (updates.containsKey("agentTeam"))       ticket.setAgentTeam((String) updates.get("agentTeam"));
                    if (updates.containsKey("internalNotes"))   ticket.setInternalNotes((String) updates.get("internalNotes"));
                    if (updates.containsKey("resolutionNotes")) ticket.setResolutionNotes((String) updates.get("resolutionNotes"));
                    if (updates.containsKey("escalated"))       ticket.setEscalated((Boolean) updates.get("escalated"));

                    ticket.setUpdatedAt(LocalDateTime.now());
                    Ticket saved = ticketRepository.save(ticket);
                    saved.computeSlaRisk();
                    return ResponseEntity.ok(saved);
                })
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
