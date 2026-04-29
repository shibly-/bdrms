-- Demo buildings and flats for local registration (idempotent).
INSERT INTO buildings (name, building_no, address_1, address_2, post_code)
SELECT 'Green Tower', 'GT-01', '12 Lake View', 'Gulshan', '1212'
WHERE NOT EXISTS (SELECT 1 FROM buildings WHERE name = 'Green Tower');

INSERT INTO buildings (name, building_no, address_1, address_2, post_code)
SELECT 'Blue Heights', 'BH-02', '88 Central Road', 'Banani', '1213'
WHERE NOT EXISTS (SELECT 1 FROM buildings WHERE name = 'Blue Heights');

INSERT INTO flats (flat_no, building_id)
SELECT 'A-1', b.id
FROM buildings b
WHERE b.name = 'Green Tower'
  AND NOT EXISTS (
    SELECT 1 FROM flats f WHERE f.building_id = b.id AND f.flat_no = 'A-1'
  )
LIMIT 1;

INSERT INTO flats (flat_no, building_id)
SELECT 'A-2', b.id
FROM buildings b
WHERE b.name = 'Green Tower'
  AND NOT EXISTS (
    SELECT 1 FROM flats f WHERE f.building_id = b.id AND f.flat_no = 'A-2'
  )
LIMIT 1;

INSERT INTO flats (flat_no, building_id)
SELECT 'B-1', b.id
FROM buildings b
WHERE b.name = 'Blue Heights'
  AND NOT EXISTS (
    SELECT 1 FROM flats f WHERE f.building_id = b.id AND f.flat_no = 'B-1'
  )
LIMIT 1;
