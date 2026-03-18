package be.stage.ticharmony.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "user_profiles")
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(nullable = false, length = 20)
    private String color;

    @Column(length = 255)
    private String email;

    @Column(length = 50)
    private String phone;

    @Column(nullable = false)
    private boolean active = true;

    @CreationTimestamp
    private LocalDateTime createdAt;
}