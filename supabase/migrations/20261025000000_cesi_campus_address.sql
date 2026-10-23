-- Default school address for the Part A class (CESI Toulouse-Labège campus). Public data.
update public.establishments
set address = '16 Rue Magellan 31670 Labège',
    latitude = 43.548823,
    longitude = 1.502957
where email_domain = 'viacesi.fr';
