package com.hackathon.support_ticket_intelligence.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "tickets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Core ──────────────────────────────────────────────────────────────────
    private String ticketNumber;
    private String title;

    @Column(length = 4000)
    private String description;

    private String category;
    private String priority;
    private String status;

    // ── Customer ─────────────────────────────────────────────────────────────
    private String customerName;
    private String customerEmail;
    private String companyName;
    private String customerPlan;

    // ── Agent ────────────────────────────────────────────────────────────────
    private String assignedAgent;
    private String agentTeam;
    private String agentEmail;

    // ── Tags ─────────────────────────────────────────────────────────────────
    @ElementCollection
    @CollectionTable(name = "ticket_tags", joinColumns = @JoinColumn(name = "ticket_id"))
    @Column(name = "tag")
    private List<String> tags;

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    private boolean escalated;
    private int reopenCount;

    private LocalDateTime firstResponseAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime slaDeadline;
    private LocalDateTime resolvedAt;

    // ── SLA ───────────────────────────────────────────────────────────────────
    private String slaPolicy;
    private boolean slaBreached;

    // ── Resolution ────────────────────────────────────────────────────────────
    @Column(length = 4000)
    private String rootCause;

    @Column(length = 4000)
    private String resolutionNotes;

    @Column(length = 4000)
    private String internalNotes;

    // ── Duplicate Detection ───────────────────────────────────────────────────
    private boolean potentialDuplicate;      // flagged by AI
    private String  duplicateOfTicket;       // e.g. "TKT-009"
    private Double  duplicateSimilarityScore;// e.g. 0.93
    private boolean duplicateDismissed;      // agent dismissed the suggestion
    private boolean duplicateConfirmed;      // agent confirmed it's a duplicate

    // ── Computed (not persisted) ───────────────────────────────────────────────
    @Transient
    private String slaRisk;

    @Transient
    private long minutesUntilSla;

    @PostLoad
    public void computeSlaRisk() {
        if (slaBreached) {
            this.slaRisk = "BREACHED";
            this.minutesUntilSla = -1;
            return;
        }
        if (slaDeadline != null && !"RESOLVED".equals(status) && !"CLOSED".equals(status)) {
            long minutes = java.time.Duration.between(LocalDateTime.now(), slaDeadline).toMinutes();
            this.minutesUntilSla = minutes;
            if (minutes < 0)        this.slaRisk = "BREACHED";
            else if (minutes < 60)  this.slaRisk = "RED";
            else if (minutes < 240) this.slaRisk = "AMBER";
            else                    this.slaRisk = "GREEN";
        } else {
            this.slaRisk = "GREEN";
            this.minutesUntilSla = 9999;
        }
    }
}
