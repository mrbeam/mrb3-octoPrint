import sys

from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup

env = Environment(loader=FileSystemLoader(sys.argv[1] + "/templates"), autoescape=True)
env.filters["edq"] = lambda value: value
print(
    env.get_template(sys.argv[2] + "_settings.jinja2").render(_=lambda text: Markup(text))
)
