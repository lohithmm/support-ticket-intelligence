package com.hackathon.support_ticket_intelligence.api;

import com.hackathon.support_ticket_intelligence.ai.TicketAiService;
import com.hackathon.support_ticket_intelligence.ai.TicketAiService.ResolutionSuggestion;
import com.hackathon.support_ticket_intelligence.rag.DuplicateDetectionService;
import com.hackathon.support_ticket_intelligence.rag.TicketIngestionService;
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
@RequestMapping("/api/tickets")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class TicketController {

    private final TicketRepository          ticketRepository;
    private final TicketAiService           aiService;
    private final TicketRetrievalService    retrievalService;
    private final DuplicateDetectionService duplicateService;
    private final TicketIngestionService    ingestionService;

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

        // 1. Check for duplicates FIRST against existing tickets already in Qdrant
        duplicateService.checkAndFlag(saved);

        // 2. THEN ingest the new ticket into Qdrant for future duplicate checks
        //    (order matters — ingest after check so it doesn't match itself)
        ingestionService.ingestTicket(saved);

        saved.computeSlaRisk();
        log.info("Created ticket {} | duplicate={} of={}",
                saved.getTicketNumber(), saved.isPotentialDuplicate(), saved.getDuplicateOfTicket());
        return ResponseEntity.ok(saved);
    }

    // ─── PATCH /api/tickets/{id} ─────────────────────────────────────────────────
    @PatchMapping("/{id}")
    public ResponseEntity<Ticket> updateTicket(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        return ticketRepository.findById(id)
                .map(ticket -> {
                    if (updates.containsKey("status")) {
                        String newStatus = (String) updates.get("status");
                        ticket.setStatus(newStatus);
                        if ("RESOLVED".equals(newStatus) && ticket.getResolvedAt() == null)
                            ticket.setResolvedAt(LocalDateTime.now());
                    }
                    if (updates.containsKey("priority"))           ticket.setPriority((String) updates.get("priority"));
                    if (updates.containsKey("assignedAgent"))      ticket.setAssignedAgent((String) updates.get("assignedAgent"));
                    if (updates.containsKey("agentTeam"))          ticket.setAgentTeam((String) updates.get("agentTeam"));
                    if (updates.containsKey("internalNotes"))      ticket.setInternalNotes((String) updates.get("internalNotes"));
                    if (updates.containsKey("resolutionNotes"))    ticket.setResolutionNotes((String) updates.get("resolutionNotes"));
                    if (updates.containsKey("escalated"))          ticket.setEscalated((Boolean) updates.get("escalated"));
                    if (updates.containsKey("duplicateDismissed")) ticket.setDuplicateDismissed((Boolean) updates.get("duplicateDismissed"));
                    if (updates.containsKey("duplicateConfirmed")) ticket.setDuplicateConfirmed((Boolean) updates.get("duplicateConfirmed"));

                    ticket.setUpdatedAt(LocalDateTime.now());
                    Ticket saved = ticketRepository.save(ticket);
                    saved.computeSlaRisk();
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ─── GET /api/tickets/{id}/duplicates ────────────────────────────────────────
    @GetMapping("/{id}/duplicates")
    public ResponseEntity<List<DuplicateDetectionService.DuplicateCandidate>> getDuplicates(@PathVariable Long id) {
        return ticketRepository.findById(id)
                .map(ticket -> ResponseEntity.ok(duplicateService.findDuplicates(ticket)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ─── POST /api/tickets/{id}/confirm-duplicate ────────────────────────────────
    @PostMapping("/{id}/confirm-duplicate")
    public ResponseEntity<Ticket> confirmDuplicate(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ticketRepository.findById(id)
                .map(ticket -> {
                    ticket.setDuplicateConfirmed(true);
                    ticket.setDuplicateDismissed(false);
                    ticket.setPotentialDuplicate(true);
                    if (body.containsKey("duplicateOfTicket"))
                        ticket.setDuplicateOfTicket(body.get("duplicateOfTicket"));
                    ticket.setUpdatedAt(LocalDateTime.now());
                    Ticket saved = ticketRepository.save(ticket);
                    saved.computeSlaRisk();
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ─── POST /api/tickets/{id}/dismiss-duplicate ────────────────────────────────
    @PostMapping("/{id}/dismiss-duplicate")
    public ResponseEntity<Ticket> dismissDuplicate(@PathVariable Long id) {
        return ticketRepository.findById(id)
                .map(ticket -> {
                    ticket.setDuplicateDismissed(true);
                    ticket.setDuplicateConfirmed(false);
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
                .map(ticket -> ResponseEntity.ok(Map.of("summary", aiService.summariseTicket(ticket))))
                .orElse(ResponseEntity.notFound().build());
    }

    // ─── GET /api/tickets/{id}/similar ───────────────────────────────────────────
    @GetMapping("/{id}/similar")
    public ResponseEntity<?> getSimilarTickets(@PathVariable Long id) {
        return ticketRepository.findById(id)
                .map(ticket -> {
                    String query = ticket.getTitle() + " " + ticket.getDescription();
                    return ResponseEntity.ok(retrievalService.findSimilarTickets(query, 3));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ─── GET /api/tickets/{id}/resolve ───────────────────────────────────────────
    @GetMapping("/{id}/resolve")
    public ResponseEntity<ResolutionSuggestion> getResolutionSuggestion(@PathVariable Long id) {
        return ticketRepository.findById(id)
                .map(ticket -> ResponseEntity.ok(aiService.suggestResolution(ticket)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ─── POST /api/tickets/{id}/draft-response ────────────────────────────────────
    @PostMapping("/{id}/draft-response")
    public ResponseEntity<Map<String, String>> draftClientResponse(@PathVariable Long id) {
        return ticketRepository.findById(id)
                .map(ticket -> ResponseEntity.ok(Map.of("draft", aiService.draftClientResponse(ticket))))
                .orElse(ResponseEntity.notFound().build());
    }
}
