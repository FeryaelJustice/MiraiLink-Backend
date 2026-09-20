const publicUserFields = [
    ['id', 'id'],
    ['nickname', 'nickname'],
    ['bio', 'bio'],
    ['gender', 'gender'],
    ['birthdate', 'birthdate'],
    ['residence_city', 'residence_city'],
    ['residence_region', 'residence_region'],
    ['residence_country_code', 'residence_country_code'],
    ['distance_km', 'distance_km'],
    ['is_traveler', 'is_traveler'],
];

export function toPublicUser(row) {
    return Object.fromEntries(publicUserFields
        .filter(([source]) => row[source] !== undefined)
        .map(([source, destination]) => [destination, row[source]]));
}

export function toPublicUsers(rows) {
    return rows.map(toPublicUser);
}

export const PUBLIC_USER_SQL_COLUMNS = [
    'u.id',
    'u.nickname',
    'u.bio',
    'u.gender',
    'u.birthdate',
    'u.residence_city',
    'u.residence_region',
    'u.residence_country_code',
].join(', ');
