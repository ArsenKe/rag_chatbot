from modules.rag import qa_chain


def test_answer_question():
    ans = qa_chain.answer_question("Hello")
    assert isinstance(ans, str)
