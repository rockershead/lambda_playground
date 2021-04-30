'use strict'
const AWS = require('aws-sdk');

AWS.config.update({ region: "us-west-2"});
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
