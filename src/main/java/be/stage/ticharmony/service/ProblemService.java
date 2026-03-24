package be.stage.ticharmony.service;

import be.stage.ticharmony.model.*;
import be.stage.ticharmony.repository.ProblemRepository;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.*;

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
    public List<Problem> getProblems() {
        return repository.findAll();
    }

    public List<Problem> getProblemsForMember(User technician) {
        return repository.findByTechnicianNullOrTechnician(technician);
    }

    public List<Problem> getProblems(Specification<Problem> spec) {
        return repository.findAll(spec);
    }

    public Page<Problem> getProblems(Specification<Problem> spec, Pageable pageable) {
        return repository.findAll(spec, pageable);
    }

    public long countProblems(Specification<Problem> spec) {
        return repository.count(spec);
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

    public Iterable<Problem> getProblemsByUserProfile(UserProfile userProfile) {
        return repository.findByUserProfile(userProfile);
    }

    public Map<Long, Long> countOpenTicketsByTechnicians(List<User> technicians) {
        if (technicians == null || technicians.isEmpty()) return new HashMap<>();
        List<Object[]> rows = repository.countOpenTicketsByTechnicians(technicians, Status.CLOSED);
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            // Hibernate peut retourner Integer ou Long selon le driver — Number évite le ClassCastException
            map.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }
        return map;
    }

    // === Statistiques par technicien pour diagramme ===
    public List<TechnicianStatsDTO> getTechnicianStats(
            List<Problem> problems,
            User currentUser
    ) {
        Map<Long, TechnicianStatsDTO> stats = new HashMap<>();
        for (Problem p : problems) {
            if (p.getTechnician() == null) continue;
            User tech = p.getTechnician();
            Long techId = tech.getId();
            String name = (currentUser.getRole() == UserRole.MEMBER && currentUser.getId().equals(techId))
                    ? "Moi"
                    : tech.getFirstname() + " " + tech.getLastname();
            TechnicianStatsDTO dto = stats.computeIfAbsent(techId, id -> new TechnicianStatsDTO(id, name, 0));
            dto.setTicketCount(dto.getTicketCount() + 1);
        }
        return new ArrayList<>(stats.values());
    }
}
