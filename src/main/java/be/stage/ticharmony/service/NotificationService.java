package be.stage.ticharmony.service;

import be.stage.ticharmony.model.Notification;
import be.stage.ticharmony.model.NotificationType;
import be.stage.ticharmony.model.Problem;
import be.stage.ticharmony.model.User;
import be.stage.ticharmony.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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

    public void markAllRead(User user) {
        getUnreadForUser(user).forEach(n -> {
            n.setViewed(true);
            repo.save(n);
        });
    }

    /**
     * marque l’assignation lue pour ce user + ce problème
     */
    public void markAssignmentNotificationsRead(User user, Problem problem) {
        repo.findByUserAndProblemAndTypeAndViewedFalse(user, problem, NotificationType.ASSIGNED_TO_PROBLEM)
                .forEach(n -> {
                    n.setViewed(true);
                    repo.save(n);
                });
    }

    /**
     * Marque comme lue la ou les notifications non lues
     * pour cet user / ticket / type donné.
     */
    public void markReadForProblem(User user, Problem problem, NotificationType type) {
        List<Notification> toMark = repo.findByUserAndViewedFalseOrderByCreatedAtDesc(user)
                .stream()
                .filter(n -> n.getProblem().getId().equals(problem.getId())
                        && n.getType() == type)
                .toList();
        toMark.forEach(n -> {
            n.setViewed(true);
            repo.save(n);
        });
    }
}
