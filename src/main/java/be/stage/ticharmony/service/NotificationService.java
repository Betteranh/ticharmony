package be.stage.ticharmony.service;

import be.stage.ticharmony.model.Notification;
import be.stage.ticharmony.model.NotificationType;
import be.stage.ticharmony.model.Problem;
import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserProfile;
import be.stage.ticharmony.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository repo;

    public void notify(User user, Problem problem, NotificationType type) {
        Notification n = new Notification();
        n.setUser(user);
        n.setProblem(problem);
        n.setType(type);
        repo.save(n);
    }

    public List<Notification> getUnreadForUser(User user) {
        return repo.findByUserAndViewedFalseOrderByCreatedAtDesc(user);
    }

    /** Une seule requête UPDATE au lieu de N saves individuels */
    @Transactional
    public void markAllRead(User user) {
        repo.markAllReadByUser(user);
    }

    /** COUNT en base — pas de chargement de toutes les entités */
    public long countUnreadForUser(User user) {
        return repo.countUnreadByUser(user);
    }

    /** Vérifie si l'utilisateur a une notification PRIORITY_URGENT non lue */
    public boolean hasUnreadUrgentForUser(User user) {
        return repo.existsByUserAndViewedFalseAndType(user, NotificationType.PRIORITY_URGENT);
    }

    /** Une seule requête UPDATE pour un ticket précis */
    @Transactional
    public void markAllReadForProblem(User user, Problem problem) {
        repo.markAllReadByUserAndProblem(user, problem);
    }

    @Transactional
    public void markAssignmentNotificationsRead(User user, Problem problem) {
        repo.markReadByUserAndProblemAndType(user, problem, NotificationType.ASSIGNED_TO_PROBLEM);
    }

    @Transactional
    public void markReadForProblem(User user, Problem problem, NotificationType type) {
        repo.markReadByUserAndProblemAndType(user, problem, type);
    }

    public void notifyOnce(User user, Problem problem, NotificationType type) {
        if (repo.findByUserAndProblemAndTypeAndViewedFalse(user, problem, type).isEmpty()) {
            notify(user, problem, type);
        }
    }

    public void markOneRead(User user, Long notificationId) {
        repo.findById(notificationId).ifPresent(n -> {
            if (n.getUser().getId().equals(user.getId())) {
                n.setViewed(true);
                repo.save(n);
            }
        });
    }

    @Transactional
    public void deleteNotificationsForProblem(Problem problem, NotificationType type) {
        repo.deleteByProblemAndType(problem, type);
    }

    // ─── Méthodes par profil (CLIENT) ─────────────────────────────────────────

    /** Crée une notification liée à un profil client spécifique. */
    public void notify(User user, UserProfile profile, Problem problem, NotificationType type) {
        Notification n = new Notification();
        n.setUser(user);
        n.setUserProfile(profile);
        n.setProblem(problem);
        n.setType(type);
        repo.save(n);
    }

    public List<Notification> getUnreadForProfile(UserProfile profile) {
        return repo.findByUserProfileAndViewedFalseOrderByCreatedAtDesc(profile);
    }

    public long countUnreadForProfile(UserProfile profile) {
        return repo.countUnreadByUserProfile(profile);
    }

    /** Évite les doublons — vérifie par profil avant de créer. */
    public void notifyOnce(User user, UserProfile profile, Problem problem, NotificationType type) {
        if (repo.findByUserProfileAndProblemAndTypeAndViewedFalse(profile, problem, type).isEmpty()) {
            notify(user, profile, problem, type);
        }
    }

    @Transactional
    public void markAllRead(UserProfile profile) {
        repo.markAllReadByUserProfile(profile);
    }

    @Transactional
    public void markAllReadForProblem(UserProfile profile, Problem problem) {
        repo.markAllReadByUserProfileAndProblem(profile, problem);
    }
}