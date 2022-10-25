const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const statePascalToCamelCase = (dbObject) => {
  return {
    stateID: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const districtPascalToCamelCase = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const statsObjConversion = (dbObject) => {
  return {
    totalCases: dbObject.totalCases,
    totalCured: dbObject.totalCured,
    totalActive: dbObject.totalActive,
    totalDeaths: dbObject.totalDeaths,
  };
};

const stateNameConversion = (dbObject) => {
  return {
    stateName: dbObject.state_name,
  };
};

//get all states
app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `
    SELECT * FROM state order by state_id;
    `;
  const getAllStates = await db.all(getAllStatesQuery);
  response.send(
    getAllStates.map((eachState) => statePascalToCamelCase(eachState))
  );
});

//get specific state by id
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getSpecificStateQuery = `
    SELECT * FROM state WHERE state_id = ${stateId};
    `;
  const getSpecifiedState = await db.get(getSpecificStateQuery);
  response.send(statePascalToCamelCase(getSpecifiedState));
});

//create new district

app.post("/districts/", async (request, response) => {
  const districtBody = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = districtBody;

  const addDistrictQuery = `
  INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
  VALUES (
      '${districtName}',
      ${stateId},
      ${cases},
      ${cured},
      ${active},
      ${deaths}
  );
  `;
  const dbResponse = await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

//get specified district

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getSpecificDistrictQuery = `
    SELECT * FROM district WHERE district_id = ${districtId};
    `;
  const getSpecificDistrict = await db.get(getSpecificDistrictQuery);
  response.send(districtPascalToCamelCase(getSpecificDistrict));
});

//delete specific district

app.delete("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM district WHERE 
    district_id = ${districtId};
    `;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

// Update district
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const updateBody = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = updateBody;
  const updateQuery = `
    UPDATE district 
    SET 
        district_name ='${districtName}',
        state_id = ${stateId},
        cases = ${cases},
        cured = ${cured},
        active = ${active},
        deaths = ${deaths}    
        
     WHERE district_id = ${districtId};`;
  await db.run(updateQuery);
  response.send("District Details Updated");
});

//get statistics of state

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const statsQuery = `
    SELECT Sum(cases) as totalCases,
            Sum(cured) as totalCured,
            Sum(active) as totalActive,
            Sum(deaths) as totalDeaths
    FROM state JOIN district on state.state_id = district.state_id
    WHERE state.state_id = ${stateId}
    `;
  const getStats = await db.get(statsQuery);
  response.send(statsObjConversion(getStats));
});

//get state name by districtId

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateQuery = `
        SELECT state_name FROM state JOIN district ON state.state_id = district.state_id
        WHERE district.state_id = ${districtId};
        `;
  const getStateName = await db.get(getStateQuery);
  response.send(stateNameConversion(getStateName));
});
