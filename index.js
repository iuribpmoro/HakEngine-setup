const AWS = require('aws-sdk');
const fs = require('fs');
const util = require('util');

require('dotenv').config();
const exec = util.promisify(require('child_process').exec);

/* ------------------------------ SQS Functions ----------------------------- */

const getSQSContent = async () => {    
    AWS.config.update({region:'us-east-1'});

    const sqs = new AWS.SQS();
    
    const params = {
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/514234370277/TargetList.fifo"
    };

    return await sqs.receiveMessage(params).promise();
}

const deleteMessage = async (ReceiptHandle) => {    
    AWS.config.update({region:'us-east-1'});

    const sqs = new AWS.SQS();
    
    const params = {
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/514234370277/TargetList.fifo",
        ReceiptHandle: ReceiptHandle
    };

    return await sqs.deleteMessage(params).promise();
}

const releaseMessage = async (ReceiptHandle) => {    
    AWS.config.update({region:'us-east-1'});

    const sqs = new AWS.SQS();
    
    const params = {
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/514234370277/TargetList.fifo",
        ReceiptHandle: ReceiptHandle,
        VisibilityTimeout: 0
    };

    return await sqs.changeMessageVisibility(params).promise();
}

/* ---------------------------- Handle Functions ---------------------------- */

const handleSQS = async () => {
    const result = await getSQSContent();

    const messages = result.Messages;
    if(!messages || !messages.length) {
        console.log("No messages");

        return;
    }
    

    const messageToProcess = messages[0]
    const receiptHandle = messageToProcess.ReceiptHandle;
    
    const deleteResult = await deleteMessage(receiptHandle);

    const messageBody = messageToProcess.Body;

    // console.log(messageBody);

    // console.log(deleteResult);

    return messageBody;
}

/* ---------------------------- Command Functions --------------------------- */

const runCommand = async (command) => {
    try {
        const { stdout, stderr } = await exec(`${command}`);
        
        if (stdout) return stdout;
        if (stderr) return stderr;
    } catch (err) {
       console.error(err);
    };
}

const runTestCommand = async (targetURL, scanId) => {
    const scriptPath = './'
    const command = `${scriptPath}script.sh ${targetURL}`;
    
    await runCommand(command);

    const s3 = new AWS.S3();

    const destFilename = "result.txt"
    const uploadFilename = `${scanId}/${destFilename}`

    const filePath = scriptPath + 'result.txt'
    const fileContent = fs.readFileSync(filePath);

    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: uploadFilename,
        Body: fileContent
    };

    const result = await s3.upload(params).promise();

    return result
}

const runWebmap = async (targetURL) => {
    const wordlist = "/home/iuribpmoro/LIN-SPACE/hacking/tools/wordlists/raft-small-directories.txt"
    const command = `/home/iuribpmoro/LIN-SPACE/hacking/tools/Webmap/Webmap.sh ${targetURL} ${wordlist}`;
    
    const result = await runCommand(command);
}

const runAutomap = async (targetURL) => {
    const result = await runCommand("/home/iuribpmoro/LIN-SPACE/hacking/tools/Automap/Automap.sh");
    console.log(result);
}

const shutdown = async () => {
    await runCommand("poweroff");
    // console.log("Shutdown!");
}

/* ------------------------------ Main Function ----------------------------- */

(async function main(){
    const message = await handleSQS();

    if (!message) await shutdown();

    const parsedMessage = JSON.parse(message);

    const targetURL = parsedMessage.URL;
    const scanTimestamp = parsedMessage.timestamp;
    const scanId = `${targetURL}-${scanTimestamp}`;

    console.log(scanId);

    await runTestCommand(targetURL, scanId);
    // await runWebmap(targetURL);

})()