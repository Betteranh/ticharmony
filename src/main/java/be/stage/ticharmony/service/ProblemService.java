package be.stage.ticharmony.service;

import be.stage.ticharmony.model.*;
import be.stage.ticharmony.repository.ProblemRepository;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Slf4j
@Data
@Service
public class ProblemService {

    @Autowired
    private ProblemRepository repository;

    public ProblemService(ProblemRepository repository) {
        this.repository = repository;
    }

    /**
     * Récupère tous les problèmes
     *
     * @return Un Iterable contenant tous les problèmes
     * en cas de problème régler le toute seule
     */
    public Iterable<Problem> getProblems() {
        Iterable<Problem> problems = repository.findAll();
        log.debug("Get Problems call" + problems.spliterator().getExactSizeIfKnown());
        return problems;
    }

    /**
     * Récupère un problème par son id
     *
     * @param id L'id du problème
     * @return Le problème qui correspond à l'id
     */
    public Problem getProblem(Long id) {
        Optional<Problem> problemOpt = repository.findById(id);
        if (problemOpt.isPresent()) {
            log.debug("Problem found with id " + id);
            return problemOpt.get();
        } else {
            log.warn("Problem not found for id " + id);
            return null;
        }
    }

    /**
     * Crée un nouveau problème
     *
     * @param e Un nouveau problème (sans id)
     * @return Le problème créé avec son id généré
     */
    public Problem createProblem(Problem e) {
        Problem savedProblem = repository.save(e);
        log.debug("Problem created with id " + savedProblem.getId());
        return savedProblem;
    }

    /**
     * Met à jour un problème existant
     *
     * @param e Le problème à mettre à jour
     * @return Le problème mis à jour
     */
    public Problem updateProblem(Problem e) {
        Problem updatedProblem = repository.save(e);
        log.debug("Problem updated with id " + updatedProblem.getId());
        return updatedProblem;
    }

    /**
     * Supprime un problème par son id
     *
     * @param id L'id du problème à supprimer
     */
    public void deleteProblem(Long id) {
        repository.deleteById(id);
        log.debug("Problem deleted with id " + id);
    }

    public Iterable<Problem> getProblemsByStatus(Status status) {
        return repository.findByStatus(status);
    }

    public Iterable<Problem> getProblemsByPriority(Priority priority) {
        return repository.findByPriority(priority);
    }

    public Iterable<Problem> getProblemsByTicketEmail(String email) {
        return repository.findByTicketUserInfoEmail(email);
    }

    public Iterable<Problem> getProblemsByTechnician(User technician) {
        return repository.findByTechnician(technician);
    }

    public Iterable<Problem> getProblemsByUser(User user) {
        return repository.findByUser(user);
    }

    // === NOUVEAU : Filtrage combiné avancé ===
    public List<Problem> filterProblems(
            Iterable<Problem> all,
            Status status,
            Priority priority,
            Integer year,
            Integer month,
            String search
    ) {
        return StreamSupport.stream(all.spliterator(), false)
                .filter(p -> status == null || p.getStatus() == status)
                .filter(p -> priority == null || p.getPriority() == priority)
                .filter(p -> year == null || (p.getCreatedAt() != null && p.getCreatedAt().getYear() == year))
                .filter(p -> month == null || (p.getCreatedAt() != null && p.getCreatedAt().getMonthValue() == month))
                .filter(p -> search == null || search.isBlank() || (
                        p.getTitle() != null && p.getTitle().toLowerCase().contains(search.toLowerCase())
                        // Tu peux aussi inclure la description ou autre champ si tu veux
                ))
                .sorted(Comparator.comparing(Problem::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    // === NOUVEAU : Liste des années disponibles ===
    public Set<Integer> getDistinctYears(Iterable<Problem> all) {
        return StreamSupport.stream(all.spliterator(), false)
                .map(Problem::getCreatedAt)
                .filter(Objects::nonNull)
                .map(LocalDateTime::getYear)
                .collect(Collectors.toCollection(TreeSet::new));
    }

    // === NOUVEAU : Liste des mois disponibles pour une année donnée ===
    public Set<Integer> getDistinctMonths(Iterable<Problem> all, Integer year) {
        return StreamSupport.stream(all.spliterator(), false)
                .map(Problem::getCreatedAt)
                .filter(Objects::nonNull)
                .filter(dt -> year == null || dt.getYear() == year)
                .map(LocalDateTime::getMonthValue)
                .collect(Collectors.toCollection(TreeSet::new));
    }

    // === NOUVEAU : Statistiques par technicien pour diagramme ===
    public List<TechnicianStatsDTO> getTechnicianStats(
            List<Problem> problems,
            User currentUser
    ) {
        Map<Long, TechnicianStatsDTO> stats = new HashMap<>();
        for (Problem p : problems) {
            if (p.getTechnician() != null) {
                Long techId = p.getTechnician().getId();
                String name = (currentUser.getRole() == UserRole.MEMBER && currentUser.getId().equals(techId))
                        ? "Moi"
                        : p.getTechnician().getFirstname() + " " + p.getTechnician().getLastname();
                stats.computeIfAbsent(techId, id -> new TechnicianStatsDTO(techId, name, 0))
                        .setTicketCount(stats.getOrDefault(techId, new TechnicianStatsDTO(techId, name, 0)).getTicketCount() + 1);
            }
        }
        // Corrige l’incrémentation (car computeIfAbsent + getTicketCount +1 peut écraser, donc on fait plus simple)
        stats.values().forEach(ts -> ts.setTicketCount(
                problems.stream().filter(p -> p.getTechnician() != null && p.getTechnician().getId().equals(ts.getTechnicianId())).count()
        ));
        return new ArrayList<>(stats.values());
    }
}
