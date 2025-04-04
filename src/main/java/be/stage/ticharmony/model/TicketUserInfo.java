package be.stage.ticharmony.model;

import jakarta.persistence.Embeddable;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Embeddable
public class TicketUserInfo {
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
}
