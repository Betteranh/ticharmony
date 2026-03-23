package be.stage.ticharmony.repository;

import be.stage.ticharmony.model.Notification;
import be.stage.ticharmony.model.NotificationType;
import be.stage.ticharmony.model.Problem;
import be.stage.ticharmony.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserAndViewedFalseOrderByCreatedAtDesc(User user);

    List<Notification> findByUserAndProblemAndTypeAndViewedFalse(
            User user, Problem problem, NotificationType type);

    List<Notification> findByProblemAndType(Problem problem, NotificationType type);

    void deleteByProblemAndType(Problem problem, NotificationType type);

    /** COUNT en base — évite de charger toutes les entités juste pour compter */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user = ?1 AND n.viewed = false")
    long countUnreadByUser(User user);

    /** Vérifie si l'utilisateur a au moins une notification urgente non lue */
    boolean existsByUserAndViewedFalseAndType(User user, NotificationType type);

    /** UPDATE en batch — une seule requête au lieu de N saves individuels */
    @Modifying
    @Query("UPDATE Notification n SET n.viewed = true WHERE n.user = ?1 AND n.viewed = false")
    int markAllReadByUser(User user);

    /** UPDATE en batch pour un ticket précis */
    @Modifying
    @Query("UPDATE Notification n SET n.viewed = true WHERE n.user = ?1 AND n.problem = ?2 AND n.viewed = false")
    int markAllReadByUserAndProblem(User user, Problem problem);
}