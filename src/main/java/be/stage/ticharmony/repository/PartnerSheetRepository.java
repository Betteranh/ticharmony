package be.stage.ticharmony.repository;

import be.stage.ticharmony.model.PartnerSheet;
import be.stage.ticharmony.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PartnerSheetRepository extends JpaRepository<PartnerSheet, Long> {

    Optional<PartnerSheet> findByPartner(User partner);
}