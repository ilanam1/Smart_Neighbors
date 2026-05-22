const fs = require('fs');

async function testQuery() {
    try {
        const content = fs.readFileSync('c:\\Users\\omerd\\Smart_Neighbors\\DataBase\\supabase.js', 'utf8');
        const urlMatch = content.match(/const\s+SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
        const keyMatch = content.match(/const\s+SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
        
        if (!urlMatch || !keyMatch) {
            console.log("Could not find Supabase URL or Key in supabase.js");
            return;
        }
        
        const url = urlMatch[1];
        const key = keyMatch[1];

        const tables = ['profiles', 'users', 'Users', 'admins', 'service_employees'];
        
        for (const table of tables) {
            const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                console.log(`Table: ${table} | Count: ${data.length}`);
                if (data.length > 0) {
                    console.log(`Sample from ${table}:`, JSON.stringify(data[0], null, 2));
                }
            } else {
                console.log(`Table: ${table} | Error:`, data);
            }
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testQuery();
