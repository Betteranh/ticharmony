package be.stage.ticharmony.service;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserProfile;
import be.stage.ticharmony.repository.UserProfileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    @Mock
    UserProfileRepository repo;

    @InjectMocks
    UserProfileService service;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private User makeUser(long id) {
        User u = new User();
        u.setId(id);
        return u;
    }

    private UserProfile makeProfile(long id, User user, boolean active) {
        UserProfile p = new UserProfile();
        p.setId(id);
        p.setUser(user);
        p.setDisplayName("Profil #" + id);
        p.setActive(active);
        return p;
    }

    // ─── getActiveProfiles() ──────────────────────────────────────────────────

    @Test
    void getActiveProfiles_delegatesToRepo() {
        User user = makeUser(1L);
        UserProfile active = makeProfile(1L, user, true);
        when(repo.findByUserAndActiveTrueOrderByCreatedAtAsc(user)).thenReturn(List.of(active));

        List<UserProfile> result = service.getActiveProfiles(user);

        assertThat(result).containsExactly(active);
        verify(repo).findByUserAndActiveTrueOrderByCreatedAtAsc(user);
    }

    @Test
    void getActiveProfiles_noActiveProfiles_returnsEmpty() {
        User user = makeUser(1L);
        when(repo.findByUserAndActiveTrueOrderByCreatedAtAsc(user)).thenReturn(List.of());

        assertThat(service.getActiveProfiles(user)).isEmpty();
    }

    // ─── getAllProfiles() ─────────────────────────────────────────────────────

    @Test
    void getAllProfiles_returnsActiveAndInactive() {
        User user = makeUser(1L);
        UserProfile p1 = makeProfile(1L, user, true);
        UserProfile p2 = makeProfile(2L, user, false);
        when(repo.findByUserOrderByCreatedAtAsc(user)).thenReturn(List.of(p1, p2));

        List<UserProfile> result = service.getAllProfiles(user);

        assertThat(result).containsExactly(p1, p2);
    }

    // ─── findById() ───────────────────────────────────────────────────────────

    @Test
    void findById_existingId_returnsProfile() {
        User user = makeUser(1L);
        UserProfile profile = makeProfile(10L, user, true);
        when(repo.findById(10L)).thenReturn(Optional.of(profile));

        assertThat(service.findById(10L)).contains(profile);
    }

    @Test
    void findById_unknownId_returnsEmpty() {
        when(repo.findById(99L)).thenReturn(Optional.empty());

        assertThat(service.findById(99L)).isEmpty();
    }

    // ─── create() ────────────────────────────────────────────────────────────

    @Test
    void create_buildsProfileWithCorrectFieldsAndSaves() {
        User user = makeUser(1L);
        UserProfile saved = new UserProfile();
        saved.setId(5L);
        when(repo.save(any(UserProfile.class))).thenReturn(saved);

        UserProfile result = service.create(user, "Alice", "#3b82f6");

        ArgumentCaptor<UserProfile> captor = ArgumentCaptor.forClass(UserProfile.class);
        verify(repo).save(captor.capture());
        UserProfile built = captor.getValue();
        assertThat(built.getUser()).isEqualTo(user);
        assertThat(built.getDisplayName()).isEqualTo("Alice");
        assertThat(built.getColor()).isEqualTo("#3b82f6");
        assertThat(result.getId()).isEqualTo(5L);
    }

    // ─── deactivate() ────────────────────────────────────────────────────────

    @Test
    void deactivate_existingProfile_setsActiveFalseAndSaves() {
        User user = makeUser(1L);
        UserProfile profile = makeProfile(1L, user, true);
        when(repo.findById(1L)).thenReturn(Optional.of(profile));

        service.deactivate(1L);

        assertThat(profile.isActive()).isFalse();
        verify(repo).save(profile);
    }

    @Test
    void deactivate_unknownProfileId_doesNothing() {
        when(repo.findById(99L)).thenReturn(Optional.empty());

        service.deactivate(99L);

        verify(repo, never()).save(any());
    }

    // ─── reactivate() ────────────────────────────────────────────────────────

    @Test
    void reactivate_existingProfile_setsActiveTrueAndSaves() {
        User user = makeUser(1L);
        UserProfile profile = makeProfile(1L, user, false);
        when(repo.findById(1L)).thenReturn(Optional.of(profile));

        service.reactivate(1L);

        assertThat(profile.isActive()).isTrue();
        verify(repo).save(profile);
    }

    // ─── hasPassword() ────────────────────────────────────────────────────────

    @Test
    void hasPassword_withHashSet_returnsTrue() {
        UserProfile profile = new UserProfile();
        profile.setPasswordHash("$2a$10$hashedvalue");

        assertThat(service.hasPassword(profile)).isTrue();
    }

    @Test
    void hasPassword_withNullHash_returnsFalse() {
        UserProfile profile = new UserProfile();
        profile.setPasswordHash(null);

        assertThat(service.hasPassword(profile)).isFalse();
    }

    // ─── verifyPassword() ────────────────────────────────────────────────────

    @Test
    void verifyPassword_noPasswordSet_alwaysReturnsTrue() {
        UserProfile profile = new UserProfile();
        profile.setPasswordHash(null);

        assertThat(service.verifyPassword(profile, "anything")).isTrue();
        assertThat(service.verifyPassword(profile, "")).isTrue();
        assertThat(service.verifyPassword(profile, null)).isTrue();
    }

    @Test
    void verifyPassword_blankInput_withHashSet_returnsFalse() {
        UserProfile profile = new UserProfile();
        profile.setPasswordHash("$2a$10$anything");

        assertThat(service.verifyPassword(profile, "")).isFalse();
        assertThat(service.verifyPassword(profile, "   ")).isFalse();
        assertThat(service.verifyPassword(profile, null)).isFalse();
    }

    @Test
    void verifyPassword_correctPassword_returnsTrue() {
        // On crée un vrai hash BCrypt pour le test
        UserProfile profile = new UserProfile();
        String raw = "motdepasse123";
        profile.setPasswordHash(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(raw));

        assertThat(service.verifyPassword(profile, raw)).isTrue();
    }

    @Test
    void verifyPassword_wrongPassword_returnsFalse() {
        UserProfile profile = new UserProfile();
        profile.setPasswordHash(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("correct"));

        assertThat(service.verifyPassword(profile, "mauvais")).isFalse();
    }

    // ─── setPassword() ───────────────────────────────────────────────────────

    @Test
    void setPassword_hashesPasswordAndSaves() {
        UserProfile profile = new UserProfile();
        profile.setId(1L);
        when(repo.findById(1L)).thenReturn(Optional.of(profile));

        service.setPassword(1L, "nouveauMdp");

        assertThat(profile.getPasswordHash()).isNotNull().startsWith("$2a$");
        verify(repo).save(profile);
    }

    // ─── removePassword() ────────────────────────────────────────────────────

    @Test
    void removePassword_setsHashToNullAndSaves() {
        UserProfile profile = new UserProfile();
        profile.setId(1L);
        profile.setPasswordHash("$2a$10$existing");
        when(repo.findById(1L)).thenReturn(Optional.of(profile));

        service.removePassword(1L);

        assertThat(profile.getPasswordHash()).isNull();
        verify(repo).save(profile);
    }
}