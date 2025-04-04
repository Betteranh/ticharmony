package be.stage.ticharmony.service;

import be.stage.ticharmony.model.Priority;
import be.stage.ticharmony.model.Problem;
import be.stage.ticharmony.model.Status;
import be.stage.ticharmony.model.User;
import be.stage.ticharmony.repository.ProblemRepository;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

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
}
