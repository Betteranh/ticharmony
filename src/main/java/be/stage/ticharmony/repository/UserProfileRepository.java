package be.stage.ticharmony.repository;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

    List<UserProfile> findByUserAndActiveTrueOrderByCreatedAtAsc(User user);

    List<UserProfile> findByUserOrderByCreatedAtAsc(User user);
}