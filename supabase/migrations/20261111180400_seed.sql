-- Fictional testing accounts and records only.
-- No real patient, no real health number, no lab result, no diagnosis.
-- Each account is created with a random sign-in secret. Migration 8 replaces
-- those secrets again. Set a test password through the password-reset page.
-- Disable these accounts before any real information is stored.
-- Iris Calloway, MN, NP and Rosemary Hale are the practitioners named on the
-- public site. Their registration numbers are TODOs, not invented licences.
-- Other people in this file are fictional characters from the staff prototype.

create or replace function private.seed_login(
  p_id uuid,
  p_email text,
  p_password text,
  p_role text,
  p_first text,
  p_last text,
  p_legacy text,
  p_title text,
  p_status text,
  p_cred jsonb,
  p_conf text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users where id = p_id) then
    return;
  end if;
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'portal_role', p_role),
    jsonb_build_object('first_name', p_first, 'last_name', p_last),
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email', p_id::text, now(), now(), now()
  );
  insert into public.profiles (
    id, legacy_id, first_name, last_name, email, portal_role, title, cred, status, confidentiality, mfa_label
  ) values (
    p_id, p_legacy, p_first, p_last, p_email, p_role, p_title, p_cred, p_status, p_conf,
    case when p_status = 'active' then 'Authenticator app' when p_status = 'deactivated' then 'Removed' else 'Not enrolled' end
  );
end;
$$;

select private.seed_login(
  '11111111-1111-4111-8111-111111111001'::uuid, 'rose.ashby@example.com', gen_random_uuid()::text,
  'owner', 'Rose', 'Ashby', 'u-rose', 'Founder and clinic owner (fictional)', 'active', null::jsonb,
  'Signed 2 Jan 2026');
select private.seed_login(
  '11111111-1111-4111-8111-111111111002'::uuid, 'ivy.bennett@example.com', gen_random_uuid()::text,
  'admin', 'Ivy', 'Bennett', 'u-ivy', 'Administrative director (fictional)', 'active', null::jsonb,
  'Signed 4 Jan 2026');
select private.seed_login(
  '11111111-1111-4111-8111-111111111003'::uuid, 'iris.calloway@example.com', gen_random_uuid()::text,
  'medical', 'Iris', 'Calloway', 'u-lilac', 'Nurse Practitioner', 'active',
  '{"type":"NP","label":"MN, NP","reg":"TODO: CRNA registration number","verified":true}'::jsonb,
  'Signed 4 Jan 2026');
select private.seed_login(
  '11111111-1111-4111-8111-111111111004'::uuid, 'lavender.hale@example.com', gen_random_uuid()::text,
  'medical', 'Lavender', 'Hale', 'u-lavender', 'Nurse Practitioner (fictional)', 'active',
  '{"type":"NP","label":"MN, NP","reg":"TODO: CRNA registration number","verified":true}'::jsonb,
  'Annual renewal due');
select private.seed_login(
  '11111111-1111-4111-8111-111111111005'::uuid, 'rosemary.hale@example.com', gen_random_uuid()::text,
  'holistic', 'Rosemary', 'Hale', 'u-sage', 'Herbalist and nutrition specialist', 'active',
  '{"type":"HNS","label":"Herbalist and nutrition","reg":null,"verified":true}'::jsonb,
  'Signed 4 Jan 2026');
select private.seed_login(
  '11111111-1111-4111-8111-111111111006'::uuid, 'juniper.reyes@example.com', gen_random_uuid()::text,
  'admin', 'Juniper', 'Reyes', 'u-juniper', 'Patient coordinator (fictional)', 'invited', null::jsonb,
  'Required before first sign-in');
select private.seed_login(
  '11111111-1111-4111-8111-111111111007'::uuid, 'hazel.moore@example.com', gen_random_uuid()::text,
  'admin', 'Hazel', 'Moore', 'u-hazel', 'Front desk (fictional)', 'deactivated', null::jsonb,
  'Signed 6 Jan 2026');
select private.seed_login(
  '22222222-2222-4222-8222-222222222001'::uuid, 'amelia.hart@example.com', gen_random_uuid()::text,
  'client', 'Amelia', 'Hart', 'c-amelia', 'Client', 'active', null::jsonb,
  '');

insert into public.patients (
  id, legacy_id, auth_user_id, first_name, last_name, preferred_name, city, status, joined_on,
  np_profile_id, hns_profile_id, jane_chart_ref, jane_state, sharing_wish, guardian_patient_id
) values
  ('33333333-3333-4333-8333-333333333001', 'BLM-100231', '22222222-2222-4222-8222-222222222001',
   'Amelia', 'Hart', '', 'Calgary', 'Active', '2026-03-15',
   '11111111-1111-4111-8111-111111111003', '11111111-1111-4111-8111-111111111005', 'J-20418', 'matched', '', null),
  ('33333333-3333-4333-8333-333333333002', 'BLM-100244', null,
   'Noah', 'Belanger', '', 'Edmonton', 'Active', '2026-04-20',
   '11111111-1111-4111-8111-111111111004', '11111111-1111-4111-8111-111111111005', 'J-20433', 'update', 'medical-only', null),
  ('33333333-3333-4333-8333-333333333003', 'BLM-100283', null,
   'Elise', 'Fontaine', '', 'Canmore', 'Active', '2026-05-12',
   '11111111-1111-4111-8111-111111111004', '11111111-1111-4111-8111-111111111005', 'J-20490', 'matched', '', null),
  ('33333333-3333-4333-8333-333333333005', 'BLM-100252', null,
   'Priya', 'Raman', '', 'Calgary', 'Active', '2026-04-28',
   '11111111-1111-4111-8111-111111111003', '11111111-1111-4111-8111-111111111005', 'J-20451', 'matched', '', null),
  ('33333333-3333-4333-8333-333333333006', 'BLM-100268', null,
   'Mateo', 'Alvarez', 'Teo', 'Red Deer', 'Active', '2026-11-02',
   '11111111-1111-4111-8111-111111111004', '11111111-1111-4111-8111-111111111005', '', 'unlinked', '', null),
  ('33333333-3333-4333-8333-333333333004', 'BLM-100401', null,
   'Willa', 'Hart', '', 'Calgary', 'Active', '2026-06-01',
   '11111111-1111-4111-8111-111111111003', '11111111-1111-4111-8111-111111111005', 'J-20601', 'matched', '',
   '33333333-3333-4333-8333-333333333001')
on conflict (id) do nothing;

insert into private.patient_contact (patient_id, dob, email, phone, address, postal_code) values
  ('33333333-3333-4333-8333-333333333001', '1988-05-12', 'amelia.hart@example.com', '(403) 555-0142', 'Fictional street', 'T2P 0A0'),
  ('33333333-3333-4333-8333-333333333002', '1975-11-03', 'noah.b@example.com', '(780) 555-0118', 'Fictional street', 'T5J 0A0'),
  ('33333333-3333-4333-8333-333333333003', '1994-12-01', 'elise.fontaine@example.com', '(403) 555-0185', 'Fictional street', 'T1W 0A0'),
  ('33333333-3333-4333-8333-333333333005', '1991-02-19', 'priya.raman@example.com', '(403) 555-0177', 'Fictional street', 'T2P 0A1'),
  ('33333333-3333-4333-8333-333333333006', '1983-07-28', 'mateo.alvarez@example.com', '(403) 555-0163', 'Fictional street', 'T4N 0A0'),
  ('33333333-3333-4333-8333-333333333004', '2016-04-02', 'amelia.hart@example.com', '(403) 555-0142', 'Fictional street', 'T2P 0A0')
on conflict (patient_id) do nothing;

insert into private.patient_identifiers (patient_id, phn) values
  ('33333333-3333-4333-8333-333333333001', '582144821'),
  ('33333333-3333-4333-8333-333333333002', '610293307'),
  ('33333333-3333-4333-8333-333333333003', '633059812'),
  ('33333333-3333-4333-8333-333333333005', '477301196'),
  ('33333333-3333-4333-8333-333333333006', '522186640'),
  ('33333333-3333-4333-8333-333333333004', '604132209')
on conflict (patient_id) do nothing;

insert into public.appointments (patient_id, time_label, meridiem, visit_label, staff_ids, state)
select v.patient_id, v.time_label, v.meridiem, v.visit_label, v.staff_ids, v.state
from (values
  ('33333333-3333-4333-8333-333333333005'::uuid, '9:00', 'am', 'Medical · 30 min', array['11111111-1111-4111-8111-111111111003']::uuid[], 'Completed'),
  ('33333333-3333-4333-8333-333333333002'::uuid, '10:00', 'am', 'Integrated · 60 min', array['11111111-1111-4111-8111-111111111004','11111111-1111-4111-8111-111111111005']::uuid[], 'In progress'),
  ('33333333-3333-4333-8333-333333333003'::uuid, '1:00', 'pm', 'Wellness · 30 min', array['11111111-1111-4111-8111-111111111005']::uuid[], 'Upcoming'),
  ('33333333-3333-4333-8333-333333333006'::uuid, '2:00', 'pm', 'Initial integrated · 60 min', array['11111111-1111-4111-8111-111111111004','11111111-1111-4111-8111-111111111005']::uuid[], 'Forms outstanding')
) as v(patient_id, time_label, meridiem, visit_label, staff_ids, state)
where not exists (select 1 from public.appointments);

insert into public.workspace_items (kind, item_id, body, patient_ref) values
  ('req', 'R-1041', '{"id":"R-1041","pid":"BLM-100268","np":"u-lavender","by":"u-ivy","status":"Draft","updated":"Today"}', 'BLM-100268'),
  ('req', 'R-1037', '{"id":"R-1037","pid":"BLM-100252","np":"u-lilac","by":"u-ivy","status":"Ready to Send","updated":"16 Oct"}', 'BLM-100252'),
  ('req', 'R-1039', '{"id":"R-1039","pid":"BLM-100231","np":"u-lilac","by":"u-ivy","status":"Awaiting Authorization","updated":"Yesterday"}', 'BLM-100231'),
  ('task', 'T-303', '{"id":"T-303","cat":"Delivery","title":"Send authorized requisition R-1037","pid":"BLM-100252","due":"Today","pr":"Normal","who":"u-ivy","done":false}', 'BLM-100252'),
  ('task', 'T-301', '{"id":"T-301","cat":"Requisitions","title":"Finish draft requisition R-1041","pid":"BLM-100268","due":"Today","pr":"High","who":"u-ivy","done":false}', 'BLM-100268'),
  ('ctask', 'C-71', '{"id":"C-71","who":"u-lilac","title":"Authorize requisition R-1039","pid":"BLM-100231","due":"Today","done":false,"needs":"requisitions.authorize"}', 'BLM-100231'),
  ('ctask', 'C-78', '{"id":"C-78","who":"u-sage","title":"Draft the wellness section for the integrated visit","pid":"BLM-100244","due":"Today","done":false}', 'BLM-100244'),
  ('note', 'N-1', '{"id":"N-1","from":"u-ivy","to":"u-rose","kind":"task","urg":"urgent","title":"Secure email is not configured","body":"Document sending returns not configured until an email provider secret is set. No health information was attached.","due":"","pid":"","t":"2026-11-10T15:00:00Z","done":false,"read":false,"log":[]}', ''),
  ('note', 'N-4', '{"id":"N-4","from":"u-rose","to":"u-ivy","kind":"note","urg":"routine","title":"Holiday hours","body":"Clinic closes 24 Dec to 2 Jan. Please add a note to the booking page.","due":"","pid":"","t":"2026-11-08T15:00:00Z","done":false,"read":true,"log":[]}', ''),
  ('template', 'TP-01', '{"id":"TP-01","name":"Bloom requisition record","cat":"Laboratory Requisitions","ver":"1.0","eff":"Testing","status":"Active","clinic":"Natural Bloom Care Inc.","fields":8,"owner":true}', ''),
  ('delivery', 'D1', '{"id":"D1","doc":"Requisition record R-1037","pid":"BLM-100252","method":"Patient portal","to":"Patient","status":"Ready to Send","info":"Requisition record"}', 'BLM-100252'),
  ('hub', 'state', '{"policyUrl":"","posts":[{"id":"H-2","type":"policy","title":"Where clinical records live","body":"Jane is the clinical record. This portal keeps wellness education, patient-entered tracking, and requisition paperwork. Do not paste diagnoses or lab values into tasks.","date":"","by":"u-rose","t":"2026-11-01T15:00:00Z"}],"reads":{}}', ''),
  ('vac', 'state', '{"allow":{"u-rose":160,"u-ivy":120,"u-lilac":80,"u-lavender":60,"u-sage":80,"u-juniper":80,"u-hazel":0},"used":{"u-rose":24,"u-ivy":16,"u-lilac":8,"u-lavender":0,"u-sage":8,"u-juniper":0,"u-hazel":0},"requests":[{"id":"V-2","uid":"u-lilac","type":"Vacation","start":"2026-11-23","end":"2026-11-24","hours":16,"note":"","status":"Pending"}]}', ''),
  ('compliance', 'state', '{}', '')
on conflict (kind, item_id) do nothing;

insert into public.disclosures (at, patient_id, disclosed_to, purpose, what_disclosed, recorded_by, channel, status)
select '2026-10-04T15:12:00Z', '33333333-3333-4333-8333-333333333001', 'Example cardiology clinic (fictional fax)', 'Continuing care', 'Referral cover sheet', '11111111-1111-4111-8111-111111111002', 'fax', 'Sent'
where not exists (select 1 from public.disclosures);

insert into public.wellness_plans (
  legacy_id, patient_id, responsible_clinician_id, reviewer_id, kind, visit_on, status, version, body,
  created_by, modified_by, approved_by, published_by, approved_at, published_at
) values (
  'WP-1',
  '33333333-3333-4333-8333-333333333001',
  '11111111-1111-4111-8111-111111111005',
  '11111111-1111-4111-8111-111111111003',
  'Wellness consult · 30 min',
  '22 Jun',
  'Published',
  1,
  '{"w_discussed":"We talked about evening routines, daylight, and building meals around vegetables, beans, lentils, tofu and whole grains.","w_goals":"A steadier evening routine\nMeals built around plants\nWater as the usual drink","w_nutrition":"Fill about half the plate with vegetables and fruit.\nInclude beans, lentils or tofu.\nFortified plant beverages can sit beside water if you want them.\nHave tea or coffee between meals rather than with them.","w_rituals":"A caffeine-free evening drink, if your care team has said it suits you.\nScreens off about an hour before bed.","w_next":"Clinical recommendations, prescriptions and lab results stay in Jane.","w_sooner":"If you feel unwell, contact your care team. In an emergency, call 911."}'::jsonb,
  '11111111-1111-4111-8111-111111111005',
  '11111111-1111-4111-8111-111111111003',
  '11111111-1111-4111-8111-111111111003',
  '11111111-1111-4111-8111-111111111003',
  '2026-06-22T18:00:00Z',
  '2026-06-22T18:05:00Z'
) on conflict (legacy_id) do nothing;

insert into public.wellness_plans (
  legacy_id, patient_id, responsible_clinician_id, reviewer_id, kind, visit_on, status, version, body,
  created_by, modified_by
) values (
  'WP-2',
  '33333333-3333-4333-8333-333333333003',
  '11111111-1111-4111-8111-111111111005',
  '11111111-1111-4111-8111-111111111004',
  'Wellness consult · 30 min',
  '14 Oct',
  'Ready for Review',
  1,
  '{"w_discussed":"We talked about slower lunches, cooked vegetables, and an evening wind-down.","w_goals":"Comfortable digestion\nSteadier afternoons\nA calmer work week","w_nutrition":"Eat lunch away from the desk.\nPair lentils, tofu or leafy greens with peppers, citrus or tomatoes.\nKeep coffee to the morning.","w_rituals":"A 10-minute walk after lunch.\nScreens off before bed.","w_next":"This note is waiting for Nurse Practitioner approval. It is not visible to the client yet.","w_sooner":"New pain, bleeding, or feeling faint is a reason to contact the care team the same day. In an emergency, call 911."}'::jsonb,
  '11111111-1111-4111-8111-111111111005',
  '11111111-1111-4111-8111-111111111005'
) on conflict (legacy_id) do nothing;

insert into public.reference_ranges (id, marker, unit, range_label, note, sort_order) values
  ('ferritin', 'Ferritin', 'µg/L', 'A common adult interval is about 30–300', 'Intervals differ by laboratory, age and pregnancy. This is general education, not your result.', 1),
  ('vitamin-d', 'Vitamin D (25-hydroxy)', 'nmol/L', 'Many labs flag values under about 50–75 as low', 'Sunlight, fortified foods and supplements are discussed with your care team. This is not your result.', 2),
  ('tsh', 'TSH', 'mIU/L', 'A common adult interval is about 0.20–6.50', 'Thyroid results are interpreted in Jane, not here.', 3),
  ('b12', 'Vitamin B12', 'pmol/L', 'A common adult interval is about 155–700', 'People who eat only plants often need a reliable B12 source. Ask your care team before starting a supplement.', 4),
  ('a1c', 'HbA1c', '%', 'A common target discussed in primary care is under 6.0', 'This is a general teaching range, not a diagnosis and not your result.', 5),
  ('hscrp', 'hs-CRP', 'mg/L', 'Many labs describe values under about 3.0 as the usual interval', 'Inflammation markers are reviewed by your Nurse Practitioner in Jane.', 6)
on conflict (id) do nothing;

insert into public.library_articles (id, title, topic, kind, minutes, summary, body_html, recommended, published, image_path) values
(
  'vitamin-d',
  'Vitamin D through the winter',
  'Nutrition',
  'Guide',
  '5 min read',
  'Why vitamin D often dips in a Canadian winter, and plant-based sources to discuss with your care team.',
  $html$<p>Skin can make vitamin D when sunlight is strong enough. In Canada, from about October through March, the sun is often too low in the sky for that to happen, so vitamin D status often drifts down over the winter. That is a population pattern, not a reading of anyone’s laboratory result.</p>
<h2>Plant-based sources</h2>
<ul><li>Sunlight on skin in the brighter months, with the usual care about burning.</li><li>Fortified plant beverages. The amount, if any, is printed on the label.</li><li>Some fortified cereals and plant margarines. Again, the label is the source of truth.</li><li>A supplement, only when your Nurse Practitioner has recommended the product and the amount.</li></ul>
<p>Very high intakes can cause harm. Please don’t start, stop or change a supplement on your own. Questions about a laboratory number belong with your care team. This article does not interpret a result.</p>$html$,
  true, true, '/library/images/understanding-your-blood-work.jpg'
),
(
  'iron-pairing',
  'Pairing foods for iron',
  'Nutrition',
  'Guide',
  '4 min read',
  'Plant foods that contain iron, and pairings that help the body absorb it.',
  $html$<p>Beans, lentils, tofu, tempeh, pumpkin seeds, cashews, quinoa, fortified cereals and leafy greens all contribute iron. The iron in these plants is absorbed more readily when the meal also contains vitamin C.</p>
<h2>Pairings that help</h2>
<ul><li>Lentil soup with peppers or a squeeze of lemon</li><li>Tofu with broccoli or citrus</li><li>Fortified cereal with strawberries</li><li>A spinach salad with red pepper, not with tea</li></ul>
<h2>Timing tea and coffee</h2>
<p>Tea and coffee can reduce iron absorption from a meal. Having them between meals, rather than with the meal, is a simple change. A calcium-fortified drink can have a similar effect when it is taken at the same time as an iron-rich meal.</p>
<p>An iron supplement is a clinical decision. Take one only if your care team recommends it, and keep iron products away from children. This article is general education. It does not interpret a ferritin result.</p>$html$,
  true, true, '/library/images/balanced-eating-made-simple.jpg'
),
(
  'wind-down',
  'An evening wind-down',
  'Sleep and rest',
  'Practice',
  '4 min read',
  'A gentle hour before bed, from a warm drink to screens off.',
  $html$<p>A repeatable evening routine is easier to keep than a perfect one.</p>
<ul><li><strong>60 minutes before bed:</strong> dim the lights and set the phone aside.</li><li><strong>45 minutes:</strong> a caffeine-free warm drink.</li><li><strong>30 minutes:</strong> a few stretches or a paper book.</li><li><strong>Lights out:</strong> a similar time most nights.</li></ul>
<p>If you are pregnant, breastfeeding or taking medication, check with your care team before trying a new herbal tea. If sleep is often difficult, tell your care team. In an emergency, call 911.</p>$html$,
  true, true, '/library/images/an-evening-wind-down.jpg'
),
(
  'hydration',
  'Hydration, made easy',
  'Hydration',
  'Practice',
  '3 min read',
  'Small habits that make water the usual drink.',
  $html$<p>Canada’s food guide encourages water as the drink of choice. How much fluid a person needs depends on activity, weather and health. Calgary’s dry air can make thirst show up sooner than expected.</p>
<ul><li>Start the day with a glass of water.</li><li>Keep a bottle within reach.</li><li>Add lemon, cucumber or berries if you want flavour.</li><li>Have water with meals.</li></ul>
<p>Unsweetened tea or coffee, and unsweetened fortified soy beverage, can sit alongside water for many adults. If your care team has given you a fluid limit, follow that. This is general information, not a fluid prescription.</p>$html$,
  false, true, '/library/images/hydration-made-easy.jpg'
),
(
  'soups',
  'Warming winter soups',
  'Nutrition',
  'Recipe',
  'Recipe',
  'A flexible red lentil and vegetable soup.',
  $html$<p>A lentil soup is an easy way to put vegetables and a plant protein in the same pot.</p>
<p><em>Serves about 4.</em> Soften a diced onion, two carrots and two celery stalks in a spoon of oil. Add garlic, a cup of rinsed red lentils, a can of diced tomatoes and about six cups of unsalted vegetable broth. Simmer until the lentils are soft, then stir in spinach or kale and finish with lemon.</p>
<p>Adjust this for allergies. It is a recipe, not a treatment plan.</p>$html$,
  false, true, '/library/images/warming-winter-soups.jpg'
),
(
  'blood-work',
  'Understanding blood work in general',
  'Blood work and biomarkers',
  'Guide',
  '6 min read',
  'What common markers measure. This does not read anyone’s results.',
  $html$<p>A laboratory report lists a marker, a number, a unit and that laboratory’s reference interval. Intervals differ between laboratories. A number outside an interval is a reason for a conversation, not a diagnosis you can make from an article.</p>
<h2>Markers people often see</h2>
<ul><li><strong>Ferritin</strong> reflects stored iron.</li><li><strong>Vitamin D (25-hydroxy)</strong> reflects vitamin D status.</li><li><strong>TSH</strong> is part of how the thyroid is regulated.</li><li><strong>Vitamin B12</strong> supports nerve function and red blood cells. People who eat only plants need a reliable source.</li><li><strong>HbA1c</strong> reflects average blood sugar over about three months.</li><li><strong>hs-CRP</strong> is a general marker of inflammation.</li></ul>
<p>Your own results stay in Jane until your Nurse Practitioner reviews them. Daisy cannot explain a result. Ask your care team.</p>$html$,
  false, true, '/library/images/understanding-your-blood-work.jpg'
)
on conflict (id) do nothing;

update public.clinic_settings set
  environment = 'testing',
  display_name = 'Bloom',
  legal_name = 'Natural Bloom Care Inc.',
  address = 'TODO: street address, Calgary, Alberta',
  phone = 'TODO: clinic phone',
  fax = 'TODO: clinic fax',
  email = 'hello@naturalbloom.ca',
  privacy_officer = 'TODO: Privacy Officer name',
  jane_portal_url = '',
  idle_timeout_minutes = 15
where id = 1;
