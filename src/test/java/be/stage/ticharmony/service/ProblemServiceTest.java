package be.stage.ticharmony.service;

import be.stage.ticharmony.model.*;
import be.stage.ticharmony.repository.ProblemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProblemServiceTest {

    @Mock
    ProblemRepository repository;

    @InjectMocks
    ProblemService service;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private Problem problem(long id, Status status, Priority priority) {
        Problem p = new Problem();
        p.setId(id);
        p.setStatus(status);
        p.setPriority(priority);
        p.setTitle("Titre #" + id);
        p.setCreatedAt(LocalDateTime.now().minusMinutes(id)); // déterministe pour tri
        return p;
    }

    // ─── getProblem() ─────────────────────────────────────────────────────────

    @Test
    void getProblem_existingId_returnsProblem() {
        Problem p = problem(1L, Status.OPEN, Priority.MEDIUM);
        when(repository.findById(1L)).thenReturn(Optional.of(p));

        assertThat(service.getProblem(1L)).isEqualTo(p);
    }

    @Test
    void getProblem_unknownId_returnsNull() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThat(service.getProblem(99L)).isNull();
    }

    // ─── createProblem() ──────────────────────────────────────────────────────

    @Test
    void createProblem_savesAndReturnsWithGeneratedId() {
        Problem input = new Problem();
        input.setTitle("Écran noir");
        Problem saved = new Problem();
        saved.setId(5L);
        saved.setTitle("Écran noir");
        when(repository.save(input)).thenReturn(saved);

        Problem result = service.createProblem(input);

        assertThat(result.getId()).isEqualTo(5L);
        verify(repository).save(input);
    }

    // ─── updateProblem() ──────────────────────────────────────────────────────

    @Test
    void updateProblem_savesAndReturnsMergedEntity() {
        Problem p = problem(1L, Status.IN_PROGRESS, Priority.HIGH);
        when(repository.save(p)).thenReturn(p);

        Problem result = service.updateProblem(p);

        assertThat(result.getStatus()).isEqualTo(Status.IN_PROGRESS);
        verify(repository).save(p);
    }

    // ─── deleteProblem() ──────────────────────────────────────────────────────

    @Test
    void deleteProblem_callsRepositoryDeleteById() {
        service.deleteProblem(3L);
        verify(repository).deleteById(3L);
    }

    // ─── filterProblems() ────────────────────────────────────────────────────

    @Test
    void filterProblems_byStatusOPEN_returnsOnlyOpenTickets() {
        Problem open = problem(1, Status.OPEN, Priority.MEDIUM);
        Problem inProg = problem(2, Status.IN_PROGRESS, Priority.MEDIUM);
        Problem closed = problem(3, Status.CLOSED, Priority.MEDIUM);

        List<Problem> result = service.filterProblems(
                List.of(open, inProg, closed), Status.OPEN, null, null, null, null);

        assertThat(result).containsExactly(open);
    }

    @Test
    void filterProblems_nullStatus_includesAllStatuses() {
        // null status = aucun filtre sur le statut dans le service (c'est le contrôleur qui exclut CLOSED)
        Problem open = problem(1, Status.OPEN, Priority.MEDIUM);
        Problem closed = problem(2, Status.CLOSED, Priority.MEDIUM);
        Problem inProg = problem(3, Status.IN_PROGRESS, Priority.MEDIUM);

        List<Problem> result = service.filterProblems(
                List.of(open, closed, inProg), null, null, null, null, null);

        assertThat(result).containsExactlyInAnyOrder(open, closed, inProg);
    }

    @Test
    void filterProblems_byPriorityURGENT_returnsOnlyUrgent() {
        Problem urgent = problem(1, Status.OPEN, Priority.URGENT);
        Problem medium = problem(2, Status.OPEN, Priority.MEDIUM);

        List<Problem> result = service.filterProblems(
                List.of(urgent, medium), null, Priority.URGENT, null, null, null);

        assertThat(result).containsExactly(urgent);
    }

    @Test
    void filterProblems_bySearch_findsCaseInsensitiveTitleMatch() {
        Problem match = problem(1, Status.OPEN, Priority.MEDIUM);
        match.setTitle("Imprimante en panne");
        Problem noMatch = problem(2, Status.OPEN, Priority.MEDIUM);
        noMatch.setTitle("Réseau lent");

        List<Problem> result = service.filterProblems(
                List.of(match, noMatch), null, null, null, null, "imprimante");

        assertThat(result).containsExactly(match);
    }

    @Test
    void filterProblems_emptySearch_returnsAllNonClosed() {
        Problem p1 = problem(1, Status.OPEN, Priority.MEDIUM);
        Problem p2 = problem(2, Status.IN_PROGRESS, Priority.HIGH);

        List<Problem> result = service.filterProblems(
                List.of(p1, p2), null, null, null, null, "");

        assertThat(result).containsExactlyInAnyOrder(p1, p2);
    }

    @Test
    void filterProblems_resultsSortedByCreatedAtDescending() {
        Problem older = problem(1, Status.OPEN, Priority.MEDIUM);
        // createdAt = now - 1 minute
        Problem newer = problem(2, Status.OPEN, Priority.MEDIUM);
        newer.setCreatedAt(LocalDateTime.now()); // most recent

        List<Problem> result = service.filterProblems(
                List.of(older, newer), null, null, null, null, null);

        // newer should come first
        assertThat(result.get(0).getId()).isEqualTo(2L);
        assertThat(result.get(1).getId()).isEqualTo(1L);
    }

    // ─── getTechnicianStats() ─────────────────────────────────────────────────

    @Test
    void getTechnicianStats_singleTech_countsAllAssignedTickets() {
        User tech = new User();
        tech.setId(10L);
        tech.setFirstname("Alice");
        tech.setLastname("D");

        Problem p1 = problem(1, Status.IN_PROGRESS, Priority.MEDIUM);
        p1.setTechnician(tech);
        Problem p2 = problem(2, Status.RESOLVED, Priority.HIGH);
        p2.setTechnician(tech);
        Problem p3 = problem(3, Status.OPEN, Priority.LOW);
        // p3 has no technician

        User admin = new User();
        admin.setId(99L);
        admin.setRole(UserRole.ADMIN);

        List<TechnicianStatsDTO> result = service.getTechnicianStats(List.of(p1, p2, p3), admin);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTechnicianId()).isEqualTo(10L);
        assertThat(result.get(0).getTicketCount()).isEqualTo(2L);
    }

    @Test
    void getTechnicianStats_memberViewingOwnTickets_showsNameAsMoi() {
        User member = new User();
        member.setId(5L);
        member.setFirstname("Bob");
        member.setLastname("T");
        member.setRole(UserRole.MEMBER);

        Problem p = problem(1, Status.IN_PROGRESS, Priority.MEDIUM);
        p.setTechnician(member);

        List<TechnicianStatsDTO> result = service.getTechnicianStats(List.of(p), member);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTechnicianName()).isEqualTo("Moi");
    }

    @Test
    void getTechnicianStats_emptyList_returnsEmpty() {
        User admin = new User();
        admin.setRole(UserRole.ADMIN);

        assertThat(service.getTechnicianStats(List.of(), admin)).isEmpty();
    }

    @Test
    void getTechnicianStats_noTechniciansAssigned_returnsEmpty() {
        Problem p1 = problem(1, Status.OPEN, Priority.MEDIUM); // no tech
        Problem p2 = problem(2, Status.OPEN, Priority.LOW);    // no tech

        User admin = new User();
        admin.setRole(UserRole.ADMIN);

        assertThat(service.getTechnicianStats(List.of(p1, p2), admin)).isEmpty();
    }
}