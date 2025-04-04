package be.stage.ticharmony.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "problems")
public class Problem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Le user qui soumet le ticket
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Technicien en charge (optionnel)
    @ManyToOne
    @JoinColumn(name = "technician_id")
    private User technician;

    // Nouveau champ Embeddable pour les informations du ticket
    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "firstName", column = @Column(name = "ticket_first_name", length = 100, nullable = false)),
            @AttributeOverride(name = "lastName", column = @Column(name = "ticket_last_name", length = 100, nullable = false)),
            @AttributeOverride(name = "email", column = @Column(name = "ticket_email", length = 255, nullable = false)),
            @AttributeOverride(name = "phone", column = @Column(name = "ticket_phone", length = 20, nullable = false))
    })
    private TicketUserInfo ticketUserInfo;

    // Titre succinct du ticket
    @Column(nullable = false)
    private String title;

    // Description détaillée du problème
    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    // Catégorie (ex : Hardware, Software, Réseau, etc.)
    private String category;

    // Priorité du ticket
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    // Statut du ticket
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    // Date de création du ticket (enregistrée automatiquement)
    @CreationTimestamp
    private LocalDateTime createdAt;

    // Date de dernière mise à jour (enregistrée automatiquement)
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // Date de résolution du ticket
    private LocalDateTime solvedAt;

    // Notes ou résolution apportée par le technicien
    @Column(columnDefinition = "TEXT")
    private String resolution;
}

