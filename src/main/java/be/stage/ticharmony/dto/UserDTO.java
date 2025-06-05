package be.stage.ticharmony.dto;

import be.stage.ticharmony.model.UserRole;
import lombok.Data;

@Data
public class UserDTO {
    private Long id;
    private String login;
    private String firstname;
    private String lastname;
    private String email;
    private String typeClient;
    private String nomEntreprise;
    private String tva;
    private String telephone;
    private String adresse;
    private String langue;
    private UserRole role;
    private String createdAt;
}
