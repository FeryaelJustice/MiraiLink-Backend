const publicUserFields = [
    ['id', 'id'],
    ['username', 'username'],
    ['nickname', 'nickname'],
    ['bio', 'bio'],
    ['gender', 'gender'],
    ['birthdate', 'birthdate'],
    ['residence_country_id', 'residence_country_id'],
    ['residence_region_id', 'residence_region_id'],
    ['residence_city_id', 'residence_city_id'],
    ['residence_city', 'residence_city'],
    ['residence_region', 'residence_region'],
    ['residence_country_code', 'residence_country_code'],
    ['distance_km', 'distance_km'],
    ['is_traveler', 'is_traveler'],
    ['profession', 'profession'],
    ['religion', 'religion'],
    ['zodiac_sign', 'zodiac_sign'],
    ['political_stance', 'political_stance'],
    ['smoking_habit', 'smoking_habit'],
    ['drinking_habit', 'drinking_habit'],
    ['sexual_orientation', 'sexual_orientation'],
    ['education_level', 'education_level'],
    ['religion_id', 'religion_id'],
    ['zodiac_sign_id', 'zodiac_sign_id'],
    ['political_stance_id', 'political_stance_id'],
    ['smoking_habit_id', 'smoking_habit_id'],
    ['drinking_habit_id', 'drinking_habit_id'],
    ['sexual_orientation_id', 'sexual_orientation_id'],
    ['education_level_id', 'education_level_id'],
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
    'u.username',
    'u.nickname',
    'u.bio',
    'u.gender',
    'u.birthdate',
    'u.residence_country_id',
    'u.residence_region_id',
    'u.residence_city_id',
].join(', ');
