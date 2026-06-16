# Python 3.11 use kar rahe hain taaki koi library error na aaye
FROM python:3.11

# Directory set kar rahe hain
WORKDIR /code

# Requirements file copy karke install kar rahe hain
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Hugging Face par non-root user zaroori hota hai, isliye user bana rahe hain
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Aapka sara code copy kar rahe hain
COPY --chown=user . $HOME/app

# Hugging Face hamesha 7860 port par chalta hai
EXPOSE 7860

# Gunicorn ke zariye Flask app chalane ka command
CMD ["gunicorn", "-b", "0.0.0.0:7860", "app:app"]
