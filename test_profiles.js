const fs = require('fs');

async function testQuery() {
    try {
        // Read the supabase config file to get URL and KEY
        const content = fs.readFileSync('c:\\Users\\omerd\\Smart_Neighbors\\DataBase\\supabase.js', 'utf8');
        const urlMatch = content.match(/const\s+SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
        const keyMatch = content.match(/const\s+SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
        
        if (!urlMatch || !keyMatch) {
            console.log("Could not find Supabase URL or Key in supabase.js");
            return;
        }
        
        const url = urlMatch[1];
        const key = keyMatch[1];
        
        // Fetch profiles via REST API
        const response = await fetch(`${url}/rest/v1/profiles?select=*`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        
        const data = await response.json();
        console.log("--- RAW DATA ---", JSON.stringify(data, null, 2));
        console.log("Total Profiles:", data.length || data.error);
        if (Array.isArray(data)) {
            data.forEach(p => {
                console.log(`- ${p.first_name || 'NoFirst'} ${p.last_name || 'NoLast'} | Building ID: ${p.building_id || 'NULL'} | Email: ${p.email}`);
            });
        } else {
            console.log("Response:", data);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testQuery();
