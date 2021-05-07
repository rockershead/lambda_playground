'use strict'
const AWS = require('aws-sdk');
const rdsDataService = new AWS.RDSDataService()
const redis = require('redis');
const mysql = require('mysql');

//for sql read and write operation
const writeCon = mysql.createConnection({
  host: "database-1.cluster-csmuobjwawcq.us-west-2.rds.amazonaws.com",
  user: "admin",
  password: "mzbt70311",
  port:3306
});
//for sql read operations
const readCon = mysql.createConnection({
  host: "database-1.cluster-ro-csmuobjwawcq.us-west-2.rds.amazonaws.com",
  user: "admin",
  password: "mzbt70311",
  port:3306
});

const redisOptions = {
  host: "redis-public-subnet.hvxh30.0001.usw2.cache.amazonaws.com",
  port: 6379
}

//AWS.config.update({ region: "us-west-2"});
const s3 = new AWS.S3();

//triggered by api gateway to add user to User Table
module.exports.addUser = async (event, context,callback) => {
  const ddb = new AWS.DynamoDB({ apiVersion: "2012-10-08"});
  const documentClient = new AWS.DynamoDB.DocumentClient({ region: "us-west-2"});

  let responseBody = "";
  let statusCode = 0;

  const { userid,age,job,name } = JSON.parse(event.body);

  const params = {
    TableName: "User",
    Item: {
      userid: Number(userid),
      age: Number(age),
      job: job,
      name:name
    }
  }

  try {
    const data = await documentClient.put(params).promise();
    responseBody = JSON.stringify(data);
    statusCode = 201;
  } catch (err) {
    responseBody = `Unable to put user data`;
    statusCode = 403;
  }

  const response = {
    statusCode: statusCode,
    headers: {
      "myHeader": "test"
    },
    body: responseBody
  }

  return response;
}



//triggered by api gateway to add user to GET from User Table

module.exports.getUser = async (event, context,callback) => {
  const ddb = new AWS.DynamoDB({ apiVersion: "2012-10-08"});
  const documentClient = new AWS.DynamoDB.DocumentClient({ region: "us-west-2"});

  let responseBody = "";
  let statusCode = 0;

  const { userid } = event.pathParameters;
  console.log(userid);

  const params = {
    TableName: "User",
    Key: {
      userid: Number(userid)
    }
  }

  try {
    const data = await documentClient.get(params).promise();
    console.log(data);
    responseBody = JSON.stringify(data.Item);
    statusCode = 200;
  } catch (err) {
    responseBody = `Unable to get user data`;
    statusCode = 403;
  }

  const response = {
    statusCode: statusCode,
    headers: {
      "myHeader": "test"
    },
    body: responseBody
  }

  return response;
}



//triggered by a s3 user.json file upload

module.exports.s3_upload = async (event,context,callback) => {
  const documentClient = new AWS.DynamoDB.DocumentClient({ region: "us-west-2"});
  let statusCode = 0;
  let responseBody = '';
  let promises=[];

  const { name } = event.Records[0].s3.bucket;
  const { key } = event.Records[0].s3.object;

  console.log(name)
  console.log(key)
  
  const getObjectParams = {
    Bucket: name,
    Key: key
  };
  
  try {
    const s3Data = await s3.getObject(getObjectParams).promise();
    
    const usersStr = s3Data.Body.toString();  //user.json file is in bytes.so need to convert to string
    const usersJSON = JSON.parse(usersStr);  //we get an array of json objects
    //console.log(usersStr);
    
    usersJSON.forEach(  user=> {
      
      const { userid, age,job,name } = user;
      
      const putParams = {
        TableName: "Users",
        Item: {
          userid: userid,
          age: Number(age),
          job: job,
          name: name
        }
      };
      
       promises.push(documentClient.put(putParams).promise());


  })

    await Promise.all(promises)
    
    
    responseBody = 'Succeeded adding users';
    statusCode = 201;
      
  } catch(err) {
      responseBody = 'Error adding users';
      statusCode = 403;
  }
  
  const response = {
    statusCode: statusCode,
    body: responseBody
  };
  
  return response;
};





//triggered by api gateway to insert user to redis
module.exports.addUserRedis = async (event, context,callback) => {
  

   let responseBody = "";
  let statusCode = 0;

 
const client = redis.createClient(redisOptions);

  const { userid,age,job,name } = JSON.parse(event.body);
  //const { userid,age,job,name } = event.body;
  

  try {
    client.setex("user", 1440, name)
    responseBody = "Name inserted"
    statusCode = 201;
  } catch (err) {
    responseBody = `Unable to put user data`;
    statusCode = 403;
  }

  const response = {
    statusCode: statusCode,
    headers: {
      "myHeader": "test"
    },
    body: responseBody
  }

  client.get("user", async (err, name) => {
    if (name) {
      
      responseBody = name
      statusCode = 200;

    }

    else{
      responseBody="No user"
      statusCode=200

    }

    console.log(responseBody)
  
  })

  return response;
}

//triggered by api gateway to get user from redis

module.exports.getUserRedis = async (event, context,callback) => {
  

   let responseBody = "";
   let statusCode = 0;
 
  
 const client = redis.createClient(redisOptions);
 
   
 
   
 
   try {

    client.get("user", async (err, name) => {
      if (name) {
        
        responseBody = name
        statusCode = 200;

      }

      else{
        responseBody="No user"
        statusCode=200

      }
    
    })


     
     
   } catch (err) {
     responseBody = `Unable to get user data`;
     statusCode = 403;
   }
 
   const response = {
     statusCode: statusCode,
     headers: {
       "myHeader": "test"
     },
     body: responseBody
   }
 
   return response;
 }



//triggered by api gateway to add user to aurora

module.exports.addUserAurora = async (event, context,callback) => {
   
   console.log("function invoked")

  let responseBody = "";
  let statusCode = 0;

  const { userid,age,job,name } = JSON.parse(event.body);
  

  

 
writeCon.connect(function(err) {
    writeCon.query(`INSERT INTO user_registration.users (userid,age,job,name) VALUES ('${userid}','${age}','${job}','${name}')`, function(err, result, fields) {
        if (err) 
        {
          responseBody = 'Unable to put user data';
          statusCode = 403;
        }
        if (result)
        {
          responseBody = 'Success';
          statusCode = 201;
        }

        const response = {
          statusCode: statusCode,
          headers: {
            "myHeader": "test"
          },
          body: responseBody
        }
        
          return response;
        
    });
});


}




//triggered by api gateway to get user from aurora

module.exports.getUserAurora = async (event, context,callback) => {
  
  console.log("function invoked")
  let responseBody = "";
  let statusCode = 0;

  
  const { userid } = event.pathParameters;
  
   console.log(userid)
 
readCon.connect(function(err) {
  console.log("connected")
    readCon.query(`SELECT * FROM user_registration.users WHERE userid='${userid}'`, function(err, result, fields) {
        if (err) 
        {console.log(err)
          responseBody = `Unable to retrieve user data`;
          statusCode = 403;
        }
        if (result)
        {
          console.log(result)
          responseBody = result;
          statusCode = 200;
        }

        const response = {
          statusCode: statusCode,
          headers: {
            "myHeader": "test"
          },
          body: responseBody
        }
        
          return response;
        
    });
});


}




module.exports.addUserAuroraServerless = async (event, context,callback) => {
   
  console.log("function invoked")

  const { userid,age,job,name } = JSON.parse(event.body);
 //const { userid,age,job,name } = event.body;

 

  let sqlParams = {
    secretArn: 'arn:aws:secretsmanager:us-west-2:803409492696:secret:rds-db-credentials/cluster-SXUFLL5XGCFDKUSNGIHM4L2AKA/admin-QEuJ4p',
    resourceArn: 'arn:aws:rds:us-west-2:803409492696:cluster:database-1',
    sql: `INSERT INTO users (userid,age,job,name) VALUES ('${userid}','${age}','${job}','${name}');`,
    database: 'user_registration',
    includeResultMetadata: true
  }

 let responseBody="";
 let statusCode=0;
 

 


 rdsDataService.executeStatement(sqlParams, function (err, data) {
  if (err) {
    // error
    console.log(err)
     responseBody = 'Unable to put user data';
     statusCode = 403;
  }
  else{
     responseBody = 'Success';
       statusCode = 201;

  }

  const response = {
    statusCode: statusCode,
    headers: {
      "myHeader": "test"
    },
    body: responseBody
  }
    console.log(response)
    return response;
  
  
  })
 





}



module.exports.getUserAuroraServerless = async (event, context,callback) => {
   
  console.log("function invoked")

  
  const { userid } = event.pathParameters;

 

  let sqlParams = {
    secretArn: 'arn:aws:secretsmanager:us-west-2:803409492696:secret:rds-db-credentials/cluster-SXUFLL5XGCFDKUSNGIHM4L2AKA/admin-QEuJ4p',
    resourceArn: 'arn:aws:rds:us-west-2:803409492696:cluster:database-1',
    sql: `SELECT * FROM user_registration.users WHERE userid='${userid}'`,
    database: 'user_registration',
    includeResultMetadata: true
  }

 let responseBody="";
 let statusCode=0;
 

 


 rdsDataService.executeStatement(sqlParams, function (err, data) {
  if (err) {
    // error
    console.log(err)
     responseBody = 'Unable to retrieve user data';
     statusCode = 403;
  }
  else{
     responseBody = data.records[0];
       statusCode = 200;

  }

  const response = {
    statusCode: statusCode,
    headers: {
      "myHeader": "test"
    },
    body: responseBody
  }
    console.log(response)
    return response;
  
  
  })
 





}
