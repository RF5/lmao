import os, time
import urllib.request

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import render
from django.views.generic import View
from rest_framework.authentication import (SessionAuthentication,
                                           TokenAuthentication)
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

import torch
import torch.nn.functional as F
from transformers import GPT2LMHeadModel, GPT2Tokenizer
from transformers import WEIGHTS_NAME, CONFIG_NAME

'''
LMAO [Language Model Accessor Orchestrator views
'''

output_dir = "./models/gpt2-small"
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print("Loading model into memory from dir ", output_dir)
# Step 1: Save a model, configuration and vocabulary that you have fine-tuned

# If we have a distributed model, save only the encapsulated model
# (it was wrapped in PyTorch DistributedDataParallel or DataParallel)
# model_to_save = model.module if hasattr(model, 'module') else model

# If we save using the predefined names, we can load using `from_pretrained`
# output_model_file = os.path.join(output_dir, WEIGHTS_NAME)
# output_config_file = os.path.join(output_dir, CONFIG_NAME)

# torch.save(model_to_save.state_dict(), output_model_file)
# model_to_save.config.to_json_file(output_config_file)
# tokenizer.save_vocabulary(output_dir)

# Step 2: Re-load the saved model and vocabulary
model = GPT2LMHeadModel.from_pretrained(output_dir)
tokenizer = GPT2Tokenizer.from_pretrained(output_dir)
model.eval()
model.to(device)
print("Done!")
print("Is on GPU: ", next(model.parameters()).is_cuda)

def gpt2_infer(historical_context, pred_length=10, repetition_penalty=1.0, num_samples=3):
    top_p = 0.5
    temperature = 0.9 # more temperature -> more entropy

    original_context_tokens = torch.tensor(tokenizer.encode(historical_context)).to(device)
    generated = original_context_tokens.unsqueeze(0).repeat(num_samples, 1)
    context = generated
    # context = torch.tensor([generated]).to(device).repeat(num_samples, 1)
    past = None

    for i in range(pred_length):
        output, past = model(context, past=past)

        next_token_logits = output[:, -1, :]
        next_token_logits /=  (temperature if temperature > 0 else 1.)
        
        filtered_logits = top_k_top_p_filtering(next_token_logits, top_p=top_p)
        if temperature == 0: # greedy sampling:
            next_token = torch.argmax(filtered_logits, dim=-1).unsqueeze(-1)
        else:
            next_token = torch.multinomial(F.softmax(filtered_logits, dim=-1), num_samples=1)
        # print(next_token, token, next_token.squeeze(), token.unsqueeze(0))
        # generated += [next_token.squeeze().tolist()]
        generated = torch.cat((generated, next_token), dim=1)
        context = next_token
        # print(past[0][0].shape) # WATCH OUT TODO: the shape of past grows a lot as u generate more tokens

    gen_seqs = []
    gen_lists = generated[:, len(original_context_tokens):].tolist()
    for o in gen_lists:
        sequence = tokenizer.decode(o, clean_up_tokenization_spaces=True)
        # print('>> ', sequence[-500:], 'TRIMMED', sequence[len(historical_context):])
        # gen_seqs.append(sequence[len(historical_context):])
        if historical_context[-1] == ' ' and sequence[0] == ' ':
            gen_seqs.append(sequence[1:])
        else:
            gen_seqs.append(sequence)

    
    return gen_seqs
    

def top_k_top_p_filtering(logits, top_k=0, top_p=0.0, filter_value=-float('Inf')):
    """ Filter a distribution of logits using top-k and/or nucleus (top-p) filtering
        Args:
            logits: logits distribution shape (batch size x vocabulary size)
            top_k > 0: keep only top k tokens with highest probability (top-k filtering).
            top_p > 0.0: keep the top tokens with cumulative probability >= top_p (nucleus filtering).
                Nucleus filtering is described in Holtzman et al. (http://arxiv.org/abs/1904.09751)
        From: https://gist.github.com/thomwolf/1a5a29f6962089e871b94cbd09daf317
    """
    top_k = min(top_k, logits.size(-1))  # Safety check
    if top_k > 0:
        # Remove all tokens with a probability less than the last token of the top-k
        indices_to_remove = logits < torch.topk(logits, top_k)[0][..., -1, None]
        logits[indices_to_remove] = filter_value

    if top_p > 0.0:
        sorted_logits, sorted_indices = torch.sort(logits, descending=True)
        cumulative_probs = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)

        # Remove tokens with cumulative probability above the threshold
        sorted_indices_to_remove = cumulative_probs > top_p
        # Shift the indices to the right to keep also the first token above the threshold
        sorted_indices_to_remove[..., 1:] = sorted_indices_to_remove[..., :-1].clone()
        sorted_indices_to_remove[..., 0] = 0

        # scatter sorted tensors to original indexing
        indices_to_remove = sorted_indices_to_remove.scatter(dim=1, index=sorted_indices, src=sorted_indices_to_remove)
        logits[indices_to_remove] = filter_value
    return logits

"""
VIEWS
"""

class Infer(APIView):
    """ Logout view; only applicable to token authentication """
    authentication_classes = (TokenAuthentication, )
    permission_classes = (AllowAny, )

    def post(self, request, format=None):
        try:
            lines = request.data['lines']
        except Exception as e:
            return Response("Error: Invalid parameters.", 
                status=status.HTTP_400_BAD_REQUEST)

        if 'pred_length' in request.data:
            try: 
                pred_length = int(request.data['pred_length'])
            except Exception as e:
                return Response("Error: prediction length specified but in wrong format",
                    status=status.HTTP_400_BAD_REQUEST)
        else:
            pred_length = 5

        start = time.time()
        pred_text = gpt2_infer('\n'.join(lines), pred_length=pred_length)
        end = time.time()
        print(f">>>>> Took {end-start} seconds.")
        print(">>>>> Predicted text: ", pred_text)
        response = {
            'message': 'Success',
            'prediction': pred_text,
        }

        return Response(response, 
            status=status.HTTP_200_OK)


