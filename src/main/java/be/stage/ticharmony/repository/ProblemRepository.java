package be.stage.ticharmony.repository;

import be.stage.ticharmony.model.Priority;
import be.stage.ticharmony.model.Problem;
import be.stage.ticharmony.model.Status;
import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProblemRepository extends JpaRepository<Problem, Long>, JpaSpecificationExecutor<Problem> {
    List<Problem> findByUser(User user);

    List<Problem> findByUserProfile(UserProfile userProfile);

    List<Problem> findByPriority(Priority priority);

    List<Problem> findByStatus(Status status);

    List<Problem> findByTicketUserInfoEmail(String email);

    List<Problem> findByTechnician(User technician);

    /** Tickets visibles par un membre : les siens + non assignés */
    @Query("SELECT p FROM Problem p WHERE p.technician IS NULL OR p.technician = ?1")
    List<Problem> findByTechnicianNullOrTechnician(User technician);
}
