from transformers import pipeline
import logging

# Set up logging for tracking model performance
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIRiskEngine:
    def __init__(self):
        logger.info("Initializing HuggingFace AI Models...")
        
        # 1. Load Toxicity Detection Model (Cyberbullying & Hate Speech)
        self.toxicity_pipeline = pipeline(
            "text-classification", 
            model="unitary/toxic-bert"
        )
        
        # 2. Load Sentiment Analysis Model (Depressive & Negative Language)
        self.sentiment_pipeline = pipeline(
            "text-classification", 
            model="cardiffnlp/twitter-roberta-base-sentiment-latest"
        )
        logger.info("AI Models Loaded Successfully.")

    def evaluate_text_risk(self, text_content: str) -> dict:
        """
        Analyzes the text input and calculates a multi-tiered Risk Assessment.
        """
        # Toxicity Inference
        tox_res = self.toxicity_pipeline(text_content)[0]
        toxicity_score = tox_res['score'] if tox_res['label'] == 'toxic' else 0.05

        # Sentiment Inference
        sent_res = self.sentiment_pipeline(text_content)[0]
        negative_sentiment_score = sent_res['score'] if sent_res['label'] == 'negative' else 0.05

        # Combined Weighted Risk Calculation
        # Combined Risk = (0.4 * Sentiment) + (0.6 * Toxicity)
        combined_risk_score = (0.4 * negative_sentiment_score) + (0.6 * toxicity_score)
        combined_risk_score = round(min(max(combined_risk_score, 0.0), 1.0), 3)

        # Risk Threshold Evaluation
        if combined_risk_score >= 0.75:
            risk_level = "HIGH"
            recommended_action = "SOS Alert: Connect user to immediate anonymous counselor via WebSockets."
        elif combined_risk_score >= 0.40:
            risk_level = "MEDIUM"
            recommended_action = "Display Legal Advice guidelines and Peer Support channel options."
        else:
            risk_level = "LOW"
            recommended_action = "Provide automated AI Mindfulness Prompts and Coping Strategies."

        return {
            "combined_risk_score": combined_risk_score,
            "risk_level": risk_level,
            "recommended_action": recommended_action,
            "metrics": {
                "toxicity_score": round(toxicity_score, 3),
                "negative_sentiment_score": round(negative_sentiment_score, 3)
            }
        }

# Global Instance Initialization
ai_engine_instance = AIRiskEngine()