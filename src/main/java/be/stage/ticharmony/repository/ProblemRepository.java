package be.stage.ticharmony.repository;

import be.stage.ticharmony.model.Priority;
import be.stage.ticharmony.model.Problem;
import be.stage.ticharmony.model.Status;
import be.stage.ticharmony.model.User;
import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface ProblemRepository extends CrudRepository<Problem, Long> {
    List<Problem> findByUser(User user);

    // Méthode de recherche par priorité et statut (si besoin)
    List<Problem> findByPriority(Priority priority);

    List<Problem> findByStatus(Status status);

    // Exemple de méthode pour rechercher par email du demandeur (ticketUserInfo)
    List<Problem> findByTicketUserInfoEmail(String email);

    List<Problem> findByTechnician(User technician);
}
