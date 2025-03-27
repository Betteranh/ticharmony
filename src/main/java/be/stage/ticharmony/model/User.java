package be.stage.ticharmony.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String login;
    private String password;
    private String firstname;
    private String lastname;
    private String email;
    private String langue;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    private LocalDateTime created_at;

    @Override
    public String toString() {
        return login + "(" + firstname + " " + lastname + " - " + role + ")";
    }
}
