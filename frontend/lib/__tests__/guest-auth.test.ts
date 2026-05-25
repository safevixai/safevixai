import {
  getOrCreateGuestId,
  getGuestProfile,
  updateGuestProfile,
  isGuestMode,
  clearGuestSession,
} from '../guest-auth';

describe('Guest Auth (Progressive Auth)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getOrCreateGuestId should create a persistent ID', () => {
    const id = getOrCreateGuestId();
    expect(id).toBeTruthy();
    expect(id.length).toBe(32);
    const id2 = getOrCreateGuestId();
    expect(id2).toBe(id);
  });

  it('getGuestProfile should return null for new session', () => {
    expect(getGuestProfile()).toBeNull();
  });

  it('getGuestProfile should return profile after creation', () => {
    getOrCreateGuestId();
    const profile = getGuestProfile();
    expect(profile).not.toBeNull();
    expect(profile!.id).toBeTruthy();
    expect(profile!.createdAt).toBeGreaterThan(0);
  });

  it('updateGuestProfile should merge fields', () => {
    getOrCreateGuestId();
    updateGuestProfile({ bloodGroup: 'O+', preferredLanguage: 'hi' });
    const profile = getGuestProfile();
    expect(profile!.bloodGroup).toBe('O+');
    expect(profile!.preferredLanguage).toBe('hi');
  });

  it('updateGuestProfile should not overwrite existing fields', () => {
    getOrCreateGuestId();
    updateGuestProfile({ bloodGroup: 'O+' });
    updateGuestProfile({ preferredLanguage: 'ta' });
    const profile = getGuestProfile();
    expect(profile!.bloodGroup).toBe('O+');
    expect(profile!.preferredLanguage).toBe('ta');
  });

  it('isGuestMode should return true after ID creation', () => {
    expect(isGuestMode()).toBe(false);
    getOrCreateGuestId();
    expect(isGuestMode()).toBe(true);
  });

  it('clearGuestSession should remove all guest data', () => {
    getOrCreateGuestId();
    clearGuestSession();
    expect(isGuestMode()).toBe(false);
    expect(getGuestProfile()).toBeNull();
  });

  it('generated IDs should be unique', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(getOrCreateGuestId());
      localStorage.clear();
    }
    expect(ids.size).toBe(100);
  });
});
