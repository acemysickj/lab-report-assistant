"""Tests for DOCX template parser."""
import sys
import os
import json
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'backend'))

from services.docx_v2.template_parser import parse_template

# Real template path for testing
REAL_TEMPLATE_PATH = r"D:\AAAOddsAndEnds\大二下\电工电子\电工实验\电路分析实验报告模版.docx"


class TestParseTemplate:
    @pytest.fixture
    def result(self):
        return parse_template(REAL_TEMPLATE_PATH)

    def test_has_template_name(self, result):
        assert 'template_name' in result
        assert len(result['template_name']) > 0

    def test_has_page_setup(self, result):
        ps = result['page_setup']
        assert 'width_cm' in ps
        assert 'height_cm' in ps
        assert ps['width_cm'] == 21.0
        assert ps['height_cm'] == 29.7
        assert 'font_ascii' in ps
        assert 'font_east_asia' in ps

    def test_has_blocks(self, result):
        assert 'blocks' in result
        assert isinstance(result['blocks'], list)
        assert len(result['blocks']) > 0

    def test_blocks_have_required_fields(self, result):
        for block in result['blocks']:
            assert 'index' in block
            assert 'type' in block
            assert 'fixed' in block
            assert block['type'] in (
                'section_heading', 'sub_heading', 'body',
                'inline_formula', 'display_formula',
                'three_line_table', 'image',
            )

    def test_block_indices_are_sequential(self, result):
        indices = [b['index'] for b in result['blocks']]
        assert indices == list(range(len(indices)))

    def test_content_table_detected(self, result):
        """The template has a 4-row content table."""
        tables = [b for b in result['blocks'] if b['type'] == 'three_line_table']
        assert len(tables) >= 1
        table = tables[0]
        assert 'num_rows' in table
        assert table['num_rows'] == 4

    def test_cover_section_headings(self, result):
        """The cover page has bold headings like '深圳大学实验报告'."""
        headings = [b for b in result['blocks'] if b['type'] == 'section_heading']
        assert len(headings) >= 1
        cover_title = headings[0]
        assert '深圳大学' in cover_title['text'] or '深' in cover_title['text']

    def test_page_setup_margins(self, result):
        ps = result['page_setup']
        assert ps['top_margin_cm'] > 0
        assert ps['bottom_margin_cm'] > 0
        assert ps['left_margin_cm'] > 0
        assert ps['right_margin_cm'] > 0


class TestMarkupJsonRoundtrip:
    def test_save_and_reload(self):
        """Test that markup JSON can be saved and reloaded correctly."""
        result = parse_template(REAL_TEMPLATE_PATH)

        with tempfile.TemporaryDirectory() as tmpdir:
            markup_path = Path(tmpdir) / 'test.markup.json'
            markup_path.write_text(json.dumps(result, ensure_ascii=False, indent=2),
                                   encoding='utf-8')

            loaded = json.loads(markup_path.read_text(encoding='utf-8'))
            assert loaded['template_name'] == result['template_name']
            assert len(loaded['blocks']) == len(result['blocks'])
            assert loaded['page_setup'] == result['page_setup']

    def test_markup_with_manual_fix(self):
        """Simulate user marking blocks as fixed/unfixed."""
        result = parse_template(REAL_TEMPLATE_PATH)
        # Simulate user fixing section headings as fixed
        for b in result['blocks']:
            if b['type'] == 'section_heading':
                b['fixed'] = True
            elif b['type'] == 'body':
                b['fixed'] = False

        fixed_count = sum(1 for b in result['blocks'] if b['fixed'])
        assert fixed_count > 0
