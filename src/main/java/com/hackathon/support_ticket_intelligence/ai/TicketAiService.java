package com.hackathon.support_ticket_intelligence.ai;

import com.hackathon.support_ticket_intelligence.rag.TicketRetrievalService;
import com.hackathon.support_ticket_intelligence.rag.TicketRetrievalService.SimilarTicket;
import com.hackathon.support_ticket_intelligence.model.Ticket;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TicketAiService {

    private final ChatClient.Builder chatClientBuilder;
    private final TicketRetrievalService retrievalService;

    // ─── 1. Summarise Ticket ────────────────────────────────────────────────────
    public String summariseTicket(Ticket ticket) {
        String prompt = """
            You are a support ticket analyst. Summarise the following support ticket concisely in 2-3 sentences.
            Focus on: what the customer problem is, what system/feature is affected, and the business impact.
            Be factual and direct. Do not add advice or solutions.
            
            Ticket #%s - %s
            Category: %s | Priority: %s
            Description: %s
            """.formatted(
                ticket.getTicketNumber(),
                ticket.getTitle(),
                ticket.getCategory(),
                ticket.getPriority(),
                ticket.getDescription()
            );

        return chatClientBuilder.build()
            .prompt(prompt)
            .call()
            .content();
    }

    // ─── 2. Suggest Resolution (RAG-powered) ────────────────────────────────────
    public ResolutionSuggestion suggestResolution(Ticket ticket) {
        String searchQuery = ticket.getTitle() + " " + ticket.getDescription();
        List<SimilarTicket> similarTickets = retrievalService.findSimilarTickets(searchQuery, 3);

        String contextBlock = buildContextFromSimilarTickets(similarTickets);

        String prompt = """
            You are an expert support engineer. Based on the similar resolved tickets below, suggest a resolution for the new ticket.
            
            NEW TICKET:
            Title: %s
            Category: %s
            Description: %s
            
            SIMILAR RESOLVED TICKETS FOR CONTEXT:
            %s
            
            Provide:
            1. LIKELY CAUSE: (1 sentence)
            2. RECOMMENDED STEPS: (numbered list of 3-5 concrete steps)
            3. ESTIMATED TIME TO RESOLVE: (e.g. 30 minutes, 2 hours)
            
            Be specific and actionable. Use the resolved ticket examples as guidance.
            """.formatted(
                ticket.getTitle(),
                ticket.getCategory(),
                ticket.getDescription(),
                contextBlock
            );

        String aiResponse = chatClientBuilder.build()
            .prompt(prompt)
            .call()
            .content();

        return new ResolutionSuggestion(aiResponse, similarTickets);
    }

    // ─── 3. Draft Client Response ────────────────────────────────────────────────
    public String draftClientResponse(Ticket ticket) {
        String prompt = """
            You are a professional customer support agent. Write a professional, empathetic email response to the customer for this support ticket.
            
            Ticket: %s
            Customer Name: %s
            Issue: %s
            Priority: %s
            Category: %s
            
            The email should:
            - Start with a personalised greeting using the customer's first name
            - Acknowledge the issue and show empathy
            - Confirm you are investigating / working on it
            - Set realistic expectations for resolution timeframe based on priority (%s = within %s)
            - Include a professional sign-off from "Support Team"
            - Be concise (under 150 words)
            - NOT reveal internal system details or root causes yet
            
            Write only the email body, no subject line.
            """.formatted(
                ticket.getTicketNumber(),
                ticket.getCustomerName(),
                ticket.getTitle(),
                ticket.getPriority(),
                ticket.getCategory(),
                ticket.getPriority(),
                getExpectedSlaText(ticket.getPriority())
            );

        return chatClientBuilder.build()
            .prompt(prompt)
            .call()
            .content();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────
    private String buildContextFromSimilarTickets(List<SimilarTicket> tickets) {
        if (tickets.isEmpty()) return "No similar tickets found.";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < tickets.size(); i++) {
            SimilarTicket t = tickets.get(i);
            sb.append("--- Similar Ticket %d: %s ---\n".formatted(i + 1, t.ticketNumber()));
            sb.append("Title: ").append(t.title()).append("\n");
            sb.append("Resolution: ").append(t.resolutionNotes()).append("\n\n");
        }
        return sb.toString();
    }

    private String getExpectedSlaText(String priority) {
        return switch (priority) {
            case "CRITICAL" -> "4 hours";
            case "HIGH" -> "8 hours";
            case "MEDIUM" -> "24 hours";
            default -> "48 hours";
        };
    }

    public record ResolutionSuggestion(
        String suggestion,
        List<SimilarTicket> similarTickets
    ) {}
}
