from research_desk.hypotheses import get_hypothesis_templates


def test_catalog_contains_ten_distinct_research_templates():
    templates = get_hypothesis_templates()
    assert len(templates) == 10
    assert len({item.key for item in templates}) == 10
    assert all(item.required_evidence and item.primary_failure_mode for item in templates)
