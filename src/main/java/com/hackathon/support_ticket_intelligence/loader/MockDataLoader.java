package com.hackathon.support_ticket_intelligence.loader;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hackathon.support_ticket_intelligence.model.Ticket;
import com.hackathon.support_ticket_intelligence.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class MockDataLoader implements CommandLineRunner {

    private final TicketRepository ticketRepository;

    @Override
    public void run(String... args) throws Exception {

        //Only seed if DB is empty — preserves user-created tickets across restarts
        if (ticketRepository.count() > 0) {
            log.info("DB already has {} tickets — skipping mock data load", ticketRepository.count());
            return;
        }

        log.info("Loading mock tickets from mock-tickets.json...");

        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        InputStream inputStream = new ClassPathResource("mock-tickets.json").getInputStream();
        List<Ticket> tickets = mapper.readValue(inputStream, new TypeReference<>() {});

        ticketRepository.saveAll(tickets);
        log.info("Successfully loaded {} tickets from mock-tickets.json", tickets.size());
    }
}
