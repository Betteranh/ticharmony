package be.stage.ticharmony.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
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

    @Size(max = 72, message = "Le mot de passe ne doit pas dépasser 72 caractères")
    private String password;
    private String firstname;
    private String lastname;
    private String email;

    @Column(name = "type_client", nullable = false)
    private String typeClient;

    @Column(name = "nom_entreprise")
    private String nomEntreprise;

    @Column(name = "tva")
    private String tva;

    private String telephone;
    private String adresse;

    private String langue;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    private LocalDateTime created_at;

    @Override
    public String toString() {
        return login + "(" + firstname + " " + lastname + " - " + role + ")";
    }
}
