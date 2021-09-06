var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient();
var table = process.env.CUSTOMER_TABLE;

exports.lambdaHandler = async (event, context) => {
    
    let methodType;
    
    try {
        methodType = event.httpMethod;
            
        switch(methodType) {
            case 'GET': {
                let customers = [];
                
                if(event.queryStringParameters) {
                    // customer name provided
                    let params = {TableName: table, Key: {"name": event.queryStringParameters.name}};
                    var customer = await dynamo.get(params).promise();
                    return await {"statusCode": 200, "headers" : {}, "body": JSON.stringify(customer)};
                    
                } else {
                    // scan the whole table
                    let params = {TableName: table};
                    let items;
                    do{
                        items =  await dynamo.scan(params).promise();
                        items.Items.forEach((item) => customers.push(item));
                        params.ExclusiveStartKey  = items.LastEvaluatedKey;
                    } while (typeof items.LastEvaluatedKey !== "undefined");
                }
                return await {"statusCode": 200, "headers" : {}, "body":JSON.stringify(customers)}; 
            }
            
            case 'POST': {
                // add customer(s)
                let body = JSON.parse(event.body);
                let customers = body.customers;
                
                await Promise.all(customers.map(async (customer) => {
                    await dynamo.put({TableName: table, Item: customer}).promise();
                }));     
                
                if (customers) {
                    for (var i = 0, len = customers.length; i < len; i++) {
                        let params = {TableName: table, Item: customers[i]};
                        dynamo.put(params).promise();
                    }
                }
                return {'statusCode': 200, 'headers' : {}, 'body':'Customer(s) saved!'};
            }
            
            case 'DELETE': {
                 if(event.queryStringParameters) {
                    // customer name provided
                    let params = {TableName: table, Key: {"name": event.queryStringParameters.name}};
                    await dynamo.delete(params).promise();
                    return await {'statusCode': 200, 'headers' : {}, 'body':'Customer deleted!'}};                
            }
            
            default: 
                return('Unknown operation: ${methodType}');
        }
    } catch (err) {
        console.log(err);
        return err;
    }
};