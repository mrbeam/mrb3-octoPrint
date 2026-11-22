import sys

from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup


def main():
    env = Environment(loader=FileSystemLoader(sys.argv[1] + "/templates"), autoescape=True)
    env.filters["edq"] = lambda value: value
    print(
        env.get_template(sys.argv[2] + "_settings.jinja2").render(_=lambda text: Markup(text))
    )


if __name__ == "__main__":
    main()
