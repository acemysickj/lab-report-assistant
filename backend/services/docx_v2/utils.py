"""LaTeX / MathML / OMML conversion utilities.

Adapted from https://github.com/Sun-ZhenXing/addFormula2docx (MIT)
Modified: fixed XSL path resolution, fixed mathml_to_omml type check bug.
"""
from pathlib import Path
from lxml import etree
from latex2mathml.converter import convert

_HERE = Path(__file__).parent
MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"
MathPara = f'<m:oMathPara xmlns:m="{MATH_NS}"></m:oMathPara>'

# Load XSL processors once at module level
_MML2OMML_XSLT = etree.XSLT(etree.parse(str(_HERE / "MML2OMML.XSL")))
_OMML2MML_XSLT = etree.XSLT(etree.parse(str(_HERE / "OMML2MML.XSL")))


def latex_to_mathml(latex: str, display: str = "inline") -> etree._Element:
    """Convert LaTeX string to MathML element tree."""
    style = display if display == "inline" else "block"
    return etree.fromstring(convert(latex, display=style))


def mathml_to_omml(mathml, display: str = "inline") -> etree._Element:
    """Convert MathML element (or string) to OMML element tree."""
    if isinstance(mathml, str):
        mathml = etree.fromstring(mathml)
    result = _MML2OMML_XSLT(mathml)
    # XSLT returns _XSLTResultTree; .getroot() gives the root element
    root = result.getroot() if hasattr(result, "getroot") else result
    if display == "inline":
        return root
    wrapper = etree.fromstring(MathPara)
    wrapper.append(root)
    return wrapper


def omml_to_mathml(omml, display: str = "inline") -> etree._Element:
    """Convert OMML element (or string) to MathML element tree."""
    if isinstance(omml, str):
        omml = etree.fromstring(omml)
    return _OMML2MML_XSLT(omml)

