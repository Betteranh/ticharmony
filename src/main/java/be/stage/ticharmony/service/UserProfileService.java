package be.stage.ticharmony.service;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserProfile;
import be.stage.ticharmony.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository repo;

    /** Profils actifs du compte entreprise (affichés sur l'écran de sélection) */
    public List<UserProfile> getActiveProfiles(User user) {
        return repo.findByUserAndActiveTrueOrderByCreatedAtAsc(user);
    }

    /** Tous les profils (actifs + désactivés — pour la gestion admin) */
    public List<UserProfile> getAllProfiles(User user) {
        return repo.findByUserOrderByCreatedAtAsc(user);
    }

    public Optional<UserProfile> findById(Long id) {
        return repo.findById(id);
    }

    public UserProfile create(User user, String displayName, String color) {
        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setDisplayName(displayName);
        profile.setColor(color);
        return repo.save(profile);
    }

    /** Désactivation douce : les tickets liés restent intacts */
    public void deactivate(Long profileId) {
        repo.findById(profileId).ifPresent(p -> {
            p.setActive(false);
            repo.save(p);
        });
    }

    public void reactivate(Long profileId) {
        repo.findById(profileId).ifPresent(p -> {
            p.setActive(true);
            repo.save(p);
        });
    }

    public UserProfile save(UserProfile profile) {
        return repo.save(profile);
    }
}