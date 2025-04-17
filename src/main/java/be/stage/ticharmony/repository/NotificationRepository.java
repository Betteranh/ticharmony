package be.stage.ticharmony.repository;

import be.stage.ticharmony.model.Notification;
import be.stage.ticharmony.model.User;
import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface NotificationRepository extends CrudRepository<Notification, Long> {
    List<Notification> findByUserAndViewedFalseOrderByCreatedAtDesc(User user);
}
