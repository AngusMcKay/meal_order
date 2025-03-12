import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "",
});

/*const completion = openai.chat.completions.create({
  model: "gpt-4o-mini",
  store: true,
  messages: [
    {"role": "user", "content": "write a haiku about ai"},
  ],
});*/


const prompt = `
Create a response which fits the schema with ingredients for banoffee pie
`;

// Open AI querying
const response = await openai.responses.create({
  model: "gpt-4o-mini",
  input: [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "Write a random message about rock climbing in Scotland"
        }
      ]
  }
  ]
});



//completion.then((result) => console.log(result.choices[0].message));
response.then((result) => console.log('testing'));

