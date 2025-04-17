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
}
