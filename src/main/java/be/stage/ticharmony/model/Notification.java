package be.stage.ticharmony.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // À qui on notifie
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Sur quel ticket
    @ManyToOne
    @JoinColumn(name = "problem_id")
    private Problem problem;

    // Type de notification
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    // Lus ou non
    private boolean viewed = false;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
